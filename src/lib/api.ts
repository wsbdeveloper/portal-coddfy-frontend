/**
 * Cliente HTTP configurado para a API
 * Usa Axios com interceptors para autenticação
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:6543/api';

// Cria instância do axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Se for FormData, garantir que seja enviado corretamente
    if (config.data instanceof FormData) {
      console.log('Interceptor: Detectado FormData');
      // Remover Content-Type para que o axios defina automaticamente com boundary
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
      // Desabilitar transformRequest para FormData - deixar o axios lidar nativamente
      config.transformRequest = [];
      // Log para debug
      console.log('Interceptor: Headers após remoção:', Object.keys(config.headers || {}));
      console.log('Interceptor: Data é FormData?', config.data instanceof FormData);
      // Verificar conteúdo do FormData
      for (const [key, value] of (config.data as FormData).entries()) {
        console.log(`Interceptor FormData[${key}]:`, value instanceof File ? `${value.name} (${value.size} bytes)` : value);
      }
    } else {
      // Se não for FormData, garantir que o Content-Type seja application/json
      if (config.headers && !config.headers['Content-Type'] && !config.headers['content-type']) {
        config.headers['Content-Type'] = 'application/json';
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => {
    // Se a resposta não tiver dados ou for string vazia, criar um objeto vazio
    if (!response.data || (typeof response.data === 'string' && response.data.trim() === '')) {
      response.data = { success: true };
    }
    return response;
  },
  (error) => {
    // Tratar erros de parse JSON
    if (error.response && error.response.data) {
      // Se o erro for de parse JSON, tentar extrair mensagem útil
      if (typeof error.response.data === 'string') {
        try {
          error.response.data = JSON.parse(error.response.data);
        } catch (e) {
          // Se não conseguir fazer parse, manter como string
          error.response.data = { error: error.response.data || 'Erro desconhecido' };
        }
      }
    }
    
    if (error.response?.status === 401) {
      // Token inválido ou expirado
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;



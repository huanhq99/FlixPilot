import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const getConfig = async () => {
  const response = await api.get('/config');
  return response.data;
};

export const saveConfig = async (config: any) => {
  const response = await api.post('/config', config);
  return response.data;
};

export const testMoviePilot = async (url: string, token: string) => {
  // 测试连接：获取用户信息
  const targetUrl = `${url.replace(/\/$/, '')}/api/v1/user/current`;
  const response = await api.post('/proxy/moviepilot', {
    target_url: targetUrl,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

export const loginMoviePilot = async (url: string, form: any) => {
  const targetUrl = `${url.replace(/\/$/, '')}/api/v1/login/access-token`;
  // MP 登录需要 x-www-form-urlencoded
  const formData = new URLSearchParams();
  formData.append('username', form.username);
  formData.append('password', form.password);

  const response = await api.post('/proxy/moviepilot', {
    target_url: targetUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });
  return response.data;
};

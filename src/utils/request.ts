import { ResponseType } from '@/interfaces/database/base';
import i18n from '@/locales/config';
import authorizationUtil, {
  getAuthorization,
  redirectToLogin,
} from '@/utils/authorization-util';
import { message, notification } from 'antd';
import { RequestMethod, extend } from 'umi-request';
import { convertTheKeysOfTheObjectToSnake } from './common-util';

const FAILED_TO_FETCH = 'Failed to fetch';

const RetcodeMessage = {
  200: i18n.t('message.200'),
  201: i18n.t('message.201'),
  202: i18n.t('message.202'),
  204: i18n.t('message.204'),
  400: i18n.t('message.400'),
  401: i18n.t('message.401'),
  403: i18n.t('message.403'),
  404: i18n.t('message.404'),
  406: i18n.t('message.406'),
  410: i18n.t('message.410'),
  413: i18n.t('message.413'),
  422: i18n.t('message.422'),
  500: i18n.t('message.500'),
  502: i18n.t('message.502'),
  503: i18n.t('message.503'),
  504: i18n.t('message.504'),
};
type ResultCode =
  | 200
  | 201
  | 202
  | 204
  | 400
  | 401
  | 403
  | 404
  | 406
  | 410
  | 413
  | 422
  | 500
  | 502
  | 503
  | 504;

const errorHandler = (error: {
  response: Response;
  message: string;
}): Response => {
  const { response } = error;
  if (error.message === FAILED_TO_FETCH) {
    notification.error({
      description: i18n.t('message.networkAnomalyDescription'),
      message: i18n.t('message.networkAnomaly'),
    });
  } else {
    if (response && response.status) {
      const errorText =
        RetcodeMessage[response.status as ResultCode] || response.statusText;
      const { status, url } = response;
      // notification.error({
      //   message: `${i18n.t('message.requestError')} ${status}: ${url}`,
      //   description: errorText,
      // });
      console.error({
        message: `${i18n.t('message.requestError')} ${status}: ${url}`,
        description: errorText,
      });
    }
  }
  return response ?? { data: { code: 1999 } };
};

const request: RequestMethod = extend({
  errorHandler,
  timeout: 300000, // 5分钟 = 300000毫秒
  getResponse: true,
});

request.interceptors.request.use((url: string, options: any) => {
  const data = url.includes('/api/')
    ? options.data
    : convertTheKeysOfTheObjectToSnake(options.data);
  const params = url.includes('/api/')
    ? options.params
    : convertTheKeysOfTheObjectToSnake(options.params);
  const token = getAuthorization();
  if (url.includes('user/login') || url.includes('user/register')) {
    delete options.headers.Authorization;
  } else if (url.includes('/api/')) {
    options.headers.Authorization = 'Bearer ragflow-' + token;
  } else {
    options.headers.Authorization = 'Bearer ' + token;
  }
  
  // 为文件下载请求设置5分钟超时时间
  if (options.responseType === 'blob') {
    options.timeout = 300000; // 5分钟
  }
  
  const headers = {
    ...options.headers,
  };
  return {
    url,
    options: {
      ...options,
      data,
      params,
      headers,
      interceptors: true,
    },
  };
});

request.interceptors.response.use(async (response: Response, options) => {
  if (response?.status === 413 || response?.status === 504) {
    message.error(RetcodeMessage[response?.status as ResultCode]);
  }

  if (options.responseType === 'blob') {
    // 对于 blob 响应，需要将 blob 数据添加到 response 对象中
    try {
      const blob = await response.clone().blob();
      return {
        ...response,
        data: blob,
      };
    } catch (error) {
      console.error('处理 blob 响应时出错:', error);
    return response;
    }
  }

  const data: ResponseType = await response?.clone()?.json();
  if (data?.code === 100) {
    message.error(data?.message);
  } else if (data?.code === 401) {
    notification.error({
      message: data?.message,
      description: data?.message,
      duration: 3,
    });
    authorizationUtil.removeAll();
    redirectToLogin();
  } else if (data?.code !== 0) {
    console.log(data)
    notification.error({
      message: `${i18n.t('message.hint')} : ${data?.code?data?.code:data?.status?data?.status:''}`,
      description: data?.message,
      duration: 3,
    });
  }
  return response;
});

export default request;

export const get = (url: string) => {
  return request.get(url);
};

export const post = (url: string, body: any) => {
  return request.post(url, body);
};

export const drop = () => {};

export const put = () => {};

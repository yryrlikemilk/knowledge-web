import userService from '@/services/user-service';
import authorizationUtil from '@/utils/authorization-util';
import { useMutation } from '@tanstack/react-query';

export const usePasswordLessLogin = (secretKey: string) => {
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['passwordless_login'],
    mutationFn: async () => {
      const { data: res = {} } = await userService.passwordless_login({
        // secretKey: 'K8mN2pQ9rT5vX7zA1bC3dE5fG7hI9j',
        secretKey,
      });

      if (res.code === 0) {
        const { data } = res;

        // const authorization = response.headers.get(Authorization);

        const token = data.token;
        const userInfo = {
          avatar: data.avatar,
          name: data.nickname,
          email: data.email,
        };
        authorizationUtil.setItems({
          Authorization: token,
          userInfo: JSON.stringify(userInfo),
          Token: token,
        });
      }
      return res.code;
    },
  });

  return { data, loading, login: mutateAsync };
};

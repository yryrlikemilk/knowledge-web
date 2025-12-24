import { useAuth } from '@/hooks/auth-hooks';
import { redirectToLogin } from '@/utils/authorization-util';
import { Outlet } from 'umi';

export default () => {
  const { isLogin } = useAuth();
  if (isLogin === true || location.pathname === '/passwordless-login') {
    return <Outlet />;
  } else if (isLogin === false) {
    redirectToLogin();
  }

  return <></>;
};

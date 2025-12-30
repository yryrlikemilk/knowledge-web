import { usePasswordLessLogin } from '@/hooks/passwordless-login';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'umi';

const PasswordlessLogin = () => {
  const [searchParams] = useSearchParams();
  const secretKey =
    searchParams.get('secretKey') || searchParams.get('auth') || '';
  const redirect = searchParams.get('redirect');
  const { login } = usePasswordLessLogin(secretKey);
  const navigate = useNavigate();
  useEffect(() => {
    login().then(() => {
      navigate(redirect || '/chat');
    });
  }, []);

  return <></>;
};

export default PasswordlessLogin;

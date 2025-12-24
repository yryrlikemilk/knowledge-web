import { usePasswordLessLogin } from '@/hooks/passwordless-login';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'umi';

const PasswordlessLogin = () => {
  const [searchParams] = useSearchParams();
  const secretKey = searchParams.get('secretKey') || '';
  const { login } = usePasswordLessLogin(secretKey);
  const navigate = useNavigate();
  useEffect(() => {
    login().then(() => {
      navigate('/chat');
    });
  }, []);

  return <></>;
};

export default PasswordlessLogin;

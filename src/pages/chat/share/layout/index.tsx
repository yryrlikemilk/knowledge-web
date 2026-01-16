import { usePasswordLessLogin } from '@/hooks/passwordless-login';
import Chat from '@/pages/chat/index';
import { Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'umi';

const LayoutShare = function () {
  const [searchParams] = useSearchParams();
  const secretKey =
    searchParams.get('secretKey') || 'K8mN2pQ9rT5vX7zA1bC3dE5fG7hI9j';
  const { login } = usePasswordLessLogin(secretKey);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    login()
      .then(() => {
        setIsLoggedIn(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-[100vh] w-full items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="h-[100vh]">
      {isLoggedIn ? <Chat isShared /> : <div>登录失败，请重试</div>}
    </div>
  );
};

export default LayoutShare;

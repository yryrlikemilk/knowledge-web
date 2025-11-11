import { Divider, Layout, theme } from 'antd';
import React from 'react';
import { Outlet, useLocation } from 'umi';
import '../locales/config';
import Header from './components/header';
import { useEffect } from 'react';
import GlobalProgressIndicator from '@/components/global-progress-indicator';

import styles from './index.less';

const { Content } = Layout;

const mainMenuMap: Record<string, string> = {
  '/knowledge': '知识库',
  '/chat': '智能聊天',
  '/file': '文件管理',
  '/trial': '检索测试',
  '/tools': '工具集',
};

const DEFAULT_TITLE = '赛迪知源';

const App: React.FC = () => {
  const {
    token: { borderRadiusLG },
  } = theme.useToken();
  const location = useLocation();

  useEffect(() => {
    const matched = Object.entries(mainMenuMap).find(([path]) =>
      location.pathname.startsWith(path)
    );
    if (matched) {
      document.title = `${DEFAULT_TITLE}-${matched[1]}`;
    } else {
      document.title = DEFAULT_TITLE;
    }
  }, [location.pathname]);

  return (
    <Layout className={styles.layout}>
      <Layout>
        <Header></Header>
        <Divider orientationMargin={0} className={styles.divider} />
        <Content
          style={{
            minHeight: 280,
            background: '#F2F3F5',
            borderRadius: borderRadiusLG,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
      <GlobalProgressIndicator />
    </Layout>
  );
};

export default App;

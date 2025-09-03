import { ReactComponent as TrialIcon } from '@/assets/svg/trial.svg';
import { ReactComponent as FileIcon } from '@/assets/svg/file-management.svg';
import { ReactComponent as ToolsIcon } from '@/assets/svg/tools.svg';
import { ReactComponent as KnowledgeBaseIcon } from '@/assets/svg/knowledge-base.svg';
import { useTranslate } from '@/hooks/common-hooks';
import { useFetchAppConf } from '@/hooks/logic-hooks';
import { useNavigateWithFromState } from '@/hooks/route-hook';
import { MessageOutlined, SearchOutlined } from '@ant-design/icons';
import { Flex, Layout, Radio, Space, theme } from 'antd';
import { MouseEventHandler, useCallback, useMemo } from 'react';
import { useLocation } from 'umi';
import Toolbar from '../right-toolbar';

import { useTheme } from '@/components/theme-provider';
import styles from './index.less';

const { Header } = Layout;

const RagHeader = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const navigate = useNavigateWithFromState();
  const { pathname } = useLocation();
  const { t } = useTranslate('header');
  const appConf = useFetchAppConf();
  const { theme: themeRag } = useTheme();
  const tagsData = useMemo(
    () => [
      { path: '/chat', name: '智能聊天', icon: MessageOutlined },
      { path: '/knowledge', name: t('knowledgeBase'), icon: KnowledgeBaseIcon },
      
      // { path: '/search', name: t('search'), icon: SearchOutlined },
      // { path: '/flow', name: t('flow'), icon: GraphIcon },
      { path: '/file', name: t('fileManager'), icon: FileIcon },
      { path: '/trial', name: t('trial'), icon: TrialIcon },
      { path: '/tools', name: t('tools'), icon: ToolsIcon },
    ],
    [t],
  );

  const currentPath = useMemo(() => {
    return (
      tagsData.find((x) => pathname.startsWith(x.path))?.name || 'knowledge'
    );
  }, [pathname, tagsData]);

  const handleChange = useCallback(
    (path: string): MouseEventHandler =>
      (e) => {
        e.preventDefault();
        navigate(path);
      },
    [navigate],
  );

  const handleLogoClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <Header
      style={{
        paddingLeft: 16,
        paddingRight: 40,
        background: "#EAF0FE",
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '64px',
      }}
    >
      <Space
        size={12}
        onClick={handleLogoClick}
        className={styles.logoWrapper}
      >
        <img src="/logo.svg" alt="logo" className={styles.appIcon} />
        <img src="/RAG_SYSTEM.png" alt="logo" className={styles.appIconLogo} />
      </Space>
      <Space size={[0, 8]} wrap className='flex-1 'style={{paddingLeft:72,height:'100%',position:"relative"}}>
        <Radio.Group
          defaultValue="a"
          buttonStyle="solid"
          className={
            themeRag === 'dark' ? styles.radioGroupDark : styles.radioGroup
          }
          value={currentPath}
        >
          {tagsData.map((item, index) => (
            <Radio.Button
              className={`${themeRag === 'dark' ? 'dark' : 'light'} 
                ${index === 0 ? 'first' : ''} 
                ${index === tagsData.length - 1 ? 'last' : ''} `}
              value={item.name}
              key={item.name}
            >
              <a href={item.path}>
                <Flex
                  align="center"
                  gap={8}
                  onClick={handleChange(item.path)}
                  className="cursor-pointer"
                >
                  <item.icon
                    className={styles.radioButtonIcon}
                    stroke={item.name === currentPath ? 'black' : 'white'}
                  ></item.icon>
                  {item.name}
                </Flex>
              </a>
            </Radio.Button>
          ))}
        </Radio.Group>
      </Space>
      <Toolbar></Toolbar>
    </Header>
  );
};

export default RagHeader;

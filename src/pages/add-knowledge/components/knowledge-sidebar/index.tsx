import { ReactComponent as ConfigurationIcon } from '@/assets/svg/knowledge-configration.svg';
import { ReactComponent as DatasetIcon } from '@/assets/svg/knowledge-dataset.svg';
import { ReactComponent as TestingIcon } from '@/assets/svg/knowledge-testing.svg';
import { ReactComponent as GraphIcon } from '@/assets/svg/knowlege-graph.svg';

import {
  useFetchKnowledgeBaseConfiguration,
  useFetchKnowledgeGraph,
} from '@/hooks/knowledge-hooks';
import {
  useGetKnowledgeSearchParams,
  useSecondPathName,
} from '@/hooks/route-hook';
import { getWidth } from '@/utils';
import { Avatar, Menu, MenuProps, Space } from 'antd';
import classNames from 'classnames';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'umi';
import { KnowledgeRouteKey } from '../../constant';
import { isEmpty } from 'lodash';
import { GitGraph, Search, Zap } from 'lucide-react';
import styles from './index.less';
import { cn, } from '@/lib/utils';
import { ReactComponent as TitleIcon } from '@/assets/svg/knowledge-title.svg';

const KnowledgeSidebar = () => {
  let navigate = useNavigate();
  const location = useLocation();
  const activeKey = useSecondPathName();
  const { knowledgeId } = useGetKnowledgeSearchParams();

  const [windowWidth, setWindowWidth] = useState(getWidth());
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([KnowledgeRouteKey.Testing]);
  const { t } = useTranslation();
  const { data: knowledgeDetails } = useFetchKnowledgeBaseConfiguration();

  const handleSelect: MenuProps['onSelect'] = (e) => {
    const { key, keyPath } = e;
    
    // 如果是子菜单项，构建完整路径
    if (keyPath.length > 1) {
      const parentKey = keyPath[keyPath.length - 1];
      const childKey = key;
      
      if (parentKey === KnowledgeRouteKey.Testing) {
        if (childKey === 'quick-test') {
          navigate(`/knowledge/testing/quick-test?id=${knowledgeId}`);
        } else if (childKey === 'deep-search') {
          navigate(`/knowledge/testing/deep-search?id=${knowledgeId}`);
        }
      } else {
        navigate(`/knowledge/${key}?id=${knowledgeId}`);
      }
    } else {
      // 如果点击的是父菜单项
      if (key === KnowledgeRouteKey.Testing) {
        // 点击"检索测试"父目录时，跳转到第一个子菜单项"快速测试"
        navigate(`/knowledge/testing/quick-test?id=${knowledgeId}`);
      } else {
        navigate(`/knowledge/${key}?id=${knowledgeId}`);
      }
    }
  };

  const { data } = useFetchKnowledgeGraph();

  type MenuItem = Required<MenuProps>['items'][number];

  const getItem = useCallback(
    (
      label: string,
      key: React.Key,
      icon?: React.ReactNode,
      disabled?: boolean,
      children?: MenuItem[],
      type?: 'group',
    ): MenuItem => {
      return {
        key,
        icon,
        children,
        label: t(`knowledgeDetails.${label}`),
        type,
        disabled,
      } as MenuItem;
    },
    [t],
  );

  const items: MenuItem[] = useMemo(() => {
    const list = [
      getItem(
        KnowledgeRouteKey.Dataset,
        KnowledgeRouteKey.Dataset,
        <DatasetIcon />,
      ),
      {
        key: KnowledgeRouteKey.Testing,
        icon: <TestingIcon />,
        label: t(`knowledgeDetails.${KnowledgeRouteKey.Testing}`),
        children: [
          {
            key: 'quick-test',
            icon: <Zap size={16} />,
            label: '快速测试',
          },
          {
            key: 'deep-search',
            icon: <Search size={16} />,
            label: '深度评估',
          },
        ],
      },
      getItem(
        KnowledgeRouteKey.Configuration,
        KnowledgeRouteKey.Configuration,
        <ConfigurationIcon />,
      ),
      getItem(
        KnowledgeRouteKey.KnowledgeGraph,
        KnowledgeRouteKey.KnowledgeGraph,
        <GraphIcon />,
      ),

    ];
    console.log(`data?.graph,data`, data?.graph, data);
    if (!isEmpty(data?.graph)) {
      list.push(
        getItem(
          KnowledgeRouteKey.KnowledgeGraph,
          KnowledgeRouteKey.KnowledgeGraph,
          <GitGraph />,
        ),
      );
    }

    return list;
  }, [data, getItem, t]);

  // 计算当前选中的菜单项
  const getSelectedKeys = () => {
    const pathname = location.pathname;
    if (pathname.includes('/knowledge/testing/quick-test')) {
      return [KnowledgeRouteKey.Testing, 'quick-test'];
    } else if (pathname.includes('/knowledge/testing/deep-search')) {
      return [KnowledgeRouteKey.Testing, 'deep-search'];
    }
    return [activeKey];
  };

  // 子菜单展开/
  const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
    setOpenKeys(keys as string[]);
  };

  useEffect(() => {
    if (windowWidth.width > 957) {
      setCollapsed(false);
    } else {
      setCollapsed(true);
    }
  }, [windowWidth.width]);

  useEffect(() => {
    const widthSize = () => {
      const width = getWidth();

      setWindowWidth(width);
    };
    window.addEventListener('resize', widthSize);
    return () => {
      window.removeEventListener('resize', widthSize);
    };
  }, []);

  return (
    <div className={styles.sidebarWrapper}>
      <div className={styles.sidebarTop}>
        <Space size={8} className='flex flex-col pt-5'>
        
          {knowledgeDetails.avatar ? (
            <Avatar size={64} src={knowledgeDetails.avatar} />
          ) : (
            <Avatar size={64} icon={<TitleIcon />} />
          )}
          <div className={styles.knowledgeTitle}>{knowledgeDetails.name}</div>
        </Space>
        <p className={cn(
          'truncate', styles.knowledgeDescription)} >
          {knowledgeDetails.description}
        </p>
      </div>
      <div className={styles.divider}></div>

      <div className={styles.menuWrapper}>
        <Menu
          openKeys={openKeys}
          selectedKeys={getSelectedKeys()}
          mode="inline"
          className={classNames(styles.menu, {
            [styles.defaultWidth]: windowWidth.width > 957,
            [styles.minWidth]: windowWidth.width <= 957,
          })}
          inlineCollapsed={collapsed}
          items={items}
          onSelect={handleSelect}
          onOpenChange={handleOpenChange}
        />
      </div>
    </div>
  );
};

export default KnowledgeSidebar;

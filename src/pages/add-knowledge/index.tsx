import { useKnowledgeBaseId } from '@/hooks/knowledge-hooks';
import {
  useNavigateWithFromState,
  useSecondPathName,
  useThirdPathName,
} from '@/hooks/route-hook';
import { Breadcrumb } from 'antd';
import { ItemType } from 'antd/es/breadcrumb/Breadcrumb';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'umi';
import Siderbar from './components/knowledge-sidebar';
import { KnowledgeDatasetRouteKey, KnowledgeRouteKey } from './constant';
import styles from './index.less';

const KnowledgeAdding = () => {
  const knowledgeBaseId = useKnowledgeBaseId();
  const location = useLocation();

  const { t } = useTranslation();
  const activeKey: KnowledgeRouteKey =
    (useSecondPathName() as KnowledgeRouteKey) || KnowledgeRouteKey.Dataset;

  const datasetActiveKey: KnowledgeDatasetRouteKey =
    useThirdPathName() as KnowledgeDatasetRouteKey;

  const gotoList = useNavigateWithFromState();

  const breadcrumbItems: ItemType[] = useMemo(() => {
    const items: ItemType[] = [
      {
        title: (
          <a onClick={() => gotoList('/knowledge')}>
            {t('header.knowledgeBase')}
          </a>
        ),
      },
    ];

    // 检查是否是深度评估页面
    const isDeepSearch = location.pathname.includes('/knowledge/testing/deep-search');
    const isReportDetail = location.pathname.includes('/knowledge/testing/deep-search/report/');
    const isQuickTest = location.pathname.includes('/knowledge/testing/quick-test');

    if (isReportDetail) {
      items.push({
        title: (
          <Link to={`/knowledge/testing/deep-search?id=${knowledgeBaseId}`}>
            <span className={styles.breadcrumbLink}>
              {t(`knowledgeDetails.${KnowledgeRouteKey.DepthEvaluation}`)}
            </span>
          </Link>
        ),
      });
      items.push({
        title: (
          <span style={{ color: '#306EFD' }}>报告详情</span>
        ),
      });
    } else if (isDeepSearch) {
      items.push({
        title: (
            <span style={{ color: '#306EFD' }}>
              {t(`knowledgeDetails.${KnowledgeRouteKey.DepthEvaluation}`)}
            </span>
        ),
      });
    } else if (isQuickTest) {
      items.push({
        title: (
            <span style={{ color: '#306EFD' }}>
              {t(`knowledgeDetails.${KnowledgeRouteKey.QuickTest}`)}
            </span>
        ),
      });
    } else {
      items.push({
        title: datasetActiveKey ? (
          <Link to={`/knowledge/${KnowledgeRouteKey.Dataset}?id=${knowledgeBaseId}`}>
            <span style={{ color: '#306EFD' }}>
              {t(`knowledgeDetails.${activeKey}`)}
            </span>
          </Link>
        ) : (
          <span style={{ color: '#306EFD' }}>
            {t(`knowledgeDetails.${activeKey}`)}
          </span>
        ),
      });

      if (datasetActiveKey) {
        items.push({
          title: t(`knowledgeDetails.${datasetActiveKey}`),
        });
      }
    }

    return items;
  }, [activeKey, datasetActiveKey, gotoList, knowledgeBaseId, t, location.pathname]);

  return (
    <>
      <div className={styles.container}>
        <Siderbar></Siderbar>
        <div className={styles.contentWrapper}>
          <Breadcrumb items={breadcrumbItems} className={styles.contentBreadcrumb} />
          <div className={styles.content}>
            <Outlet></Outlet>
          </div>
        </div>
      </div>
    </>
  );
};

export default KnowledgeAdding;

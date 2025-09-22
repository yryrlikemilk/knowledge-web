import { KnowledgeRouteKey } from '@/constants/knowledge';
import { IKnowledge } from '@/interfaces/database/knowledge';
import { formatDate } from '@/utils/date';
import { DeleteOutlined } from '@ant-design/icons';
import { Card, Button } from 'antd';
import { useNavigate } from 'umi';
import { ReactComponent as KnowlegeListTop } from '@/assets/svg/knowlegeListTop.svg';
import { useTheme } from '@/components/theme-provider';
import { useDeleteKnowledge } from '@/hooks/knowledge-hooks';
import { useShowDeleteConfirm } from '@/hooks/common-hooks';
import styles from './index.less';

interface IProps {
  item: IKnowledge;
  onDeleted?: () => void;
}

const KnowledgeCard = ({ item, onDeleted }: IProps) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { deleteKnowledge } = useDeleteKnowledge();
  const showDeleteConfirm = useShowDeleteConfirm();

  const removeKnowledge = async () => {
    await deleteKnowledge(item.id);
    if (onDeleted) onDeleted();
  };

  const handleDelete = () => {
    showDeleteConfirm({
      title:'你确定删除这个知识库吗',
       onOk: removeKnowledge,
       content:`${item.name}被删除后，将无法恢复`
      });
  };

  const handleCardClick = () => {
    navigate(`/knowledge/${KnowledgeRouteKey.Dataset}?id=${item.id}`, {
      state: { from: 'list' },
    });
  };

  return (
    <div>
      <Card className={styles.card} onClick={handleCardClick}>
        <div className={styles.container}>
          <div className={styles.content}>
            <div className='flex items-center'>
              <KnowlegeListTop className={styles.leftIcon} />
              <span
                className={theme === 'dark' ? styles.titledark : styles.title}
                style={{ fontSize: '18px', fontWeight: '500' }}>
                {item.name}
              </span>
            </div>
          </div>
          <div className={styles.titleWrapper}>
            <div className='w-full'>
              <div className='  flex justify-between '>
                <div style={{
                  color: 'rgba(29, 33, 41, 0.7)',
                  fontWeight: 'normal',
                  marginBottom: 12
                }}>文档</div>
                <div style={{
                  color: '#1D2129',
                }}>{item.doc_num}</div>
              </div>
              <div className=' flex justify-between'>
                <div style={{
                  color: 'rgba(29, 33, 41, 0.7)',
                  fontWeight: 'normal',
                  marginBottom: 12
                }}>嵌入模型</div>
                <div style={{
                  color: '#1D2129',
                }}>{item.embd_id.split('@')[0]}</div>
              </div>
            </div>
            <span className={styles.time}>
              {formatDate(item.update_time)}
            </span>
          </div>
          <div className={styles.footer} >
            <Button
              type="link"
              icon={<DeleteOutlined />}
              onClick={e => {
                e.stopPropagation();
                handleDelete();
              }}
              style={{ color: '#306EFD', fontSize: 16, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F56C6C')}
              onMouseLeave={e => (e.currentTarget.style.color = '#306EFD')}
            >删除</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default KnowledgeCard;

import MyImage from '@/components/image';
import { IChunk } from '@/interfaces/database/knowledge';
import { Card, Checkbox, CheckboxProps, Flex, Popover, Switch, Image } from 'antd';
import classNames from 'classnames';
import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';
import { api_rag_host } from '@/utils/api';
import { useTheme } from '@/components/theme-provider';
import { ChunkTextMode } from '../../constant';
import styles from './index.less';

interface IProps {
  item: IChunk;
  checked: boolean;
  switchChunk: (available?: number, chunkIds?: string[]) => void;
  editChunk: (chunkId: string) => void;
  handleCheckboxClick: (chunkId: string, checked: boolean) => void;
  selected: boolean;
  isPdf:boolean;
  clickChunkCard: (chunkId: string) => void;
  textMode: ChunkTextMode;
}

// PDF内容渲染：将[IMG::xxxx]替换为图片组件
function renderPdfContentWithImages(content: string, api_rag_host: string) {
  if (!content) return null;
  const parts = [];
  let lastIndex = 0;
  const regex = /\[IMG::([a-zA-Z0-9]+)\]/g;
  let match;
  let key = 0;
  while ((match = regex.exec(content)) !== null) {
    // 文本部分
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{content.slice(lastIndex, match.index)}</span>);
    }
    // 图片部分
    const imgId = match[1];
    parts.push(
      <Image
        key={key++}
        src={`${api_rag_host}/file/download/${imgId}`}
        style={{ maxWidth: 120, maxHeight: 120, margin: '0 4px', verticalAlign: 'middle' }}
        preview={true}
      />
    );
    lastIndex = match.index + match[0].length;
  }
  // 剩余文本
  if (lastIndex < content.length) {
    parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
  }
  return parts;
}

const ChunkCard = ({
  item,
  checked,
  isPdf,
  handleCheckboxClick,
  editChunk,
  switchChunk,
  selected,
  clickChunkCard,
  textMode,
}: IProps) => {
  const available = Number(item.available_int);
  const [enabled, setEnabled] = useState(false);
  const { theme } = useTheme();

  const onChange = (checked: boolean) => {
    setEnabled(checked);
    switchChunk(available === 0 ? 1 : 0, [item.chunk_id]);
  };

  const handleCheck: CheckboxProps['onChange'] = (e) => {
    handleCheckboxClick(item.chunk_id, e.target.checked);
  };

  const handleContentDoubleClick = () => {
    editChunk(item.chunk_id);
  };

  const handleContentClick = () => {
    clickChunkCard(item.chunk_id);
  };

  useEffect(() => {
    setEnabled(available === 1);
  }, [available]);

  return (
    <Card
      className={classNames(styles.chunkCard, {
        [`${theme === 'dark' ? styles.cardSelectedDark : styles.cardSelected}`]:
          selected,
      })}
    >
      <Flex gap={'middle'} justify={'space-between'}>
        <Checkbox onChange={handleCheck} checked={checked}></Checkbox>
        {item.image_id && (
          <Popover
            placement="right"
            content={
              <MyImage id={item.image_id} className={styles.imagePreview}></MyImage>
            }
          >
            <MyImage id={item.image_id} className={styles.image}></MyImage>
          </Popover>
        )}

        <section
          onDoubleClick={handleContentDoubleClick}
          onClick={handleContentClick}
          className={styles.content}
        >
          <div
            className={classNames(styles.contentText, {
              [styles.contentEllipsis]: textMode === ChunkTextMode.Ellipse,
            })}
          >
            {isPdf
              ? renderPdfContentWithImages(
                  item.content_with_weight.replace(/\[\{chunk_id:[^}]+\}\]/g, ''),
                  api_rag_host
                )
              : (
                <span
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      item.content_with_weight.replace(/\[\{chunk_id:[^}]+\}\]/g, '')
                    ),
                  }}
                />
              )}
          </div>
        </section>

        <div>
          <Switch checked={enabled} onChange={onChange} />
        </div>
      </Flex>
    </Card>
  );
};

export default ChunkCard;

import { ReactComponent as SelectedFilesCollapseIcon } from '@/assets/svg/selected-files-collapse.svg';
import { useTranslate } from '@/hooks/common-hooks';
import { ITestingChunk } from '@/interfaces/database/knowledge';
import {
  Card,
  Collapse,
  Empty,
  Flex,
  Image,
  Pagination,
  PaginationProps,
  Space,
  Modal,
} from 'antd';
import camelCase from 'lodash/camelCase';
import SelectFiles from './select-files';
import { formatTimeDisplay } from '@/utils/document-util';
import {
  useAllTestingResult,
  useAllTestingSuccess,
  useSelectIsTestingSuccess,
  useSelectTestingResult,
} from '@/hooks/knowledge-hooks';
import { useGetPaginationWithRouter } from '@/hooks/logic-hooks';
import { api_host } from '@/utils/api';
import { showImage } from '@/utils/chat';
import { fetchVideoChunks, getMinioDownloadUrl } from '@/services/knowledge-service';
import { useCallback, useEffect, useState, useRef } from 'react';
import styles from './index.less';
import { api_rag_host } from '@/utils/api';
const similarityList: Array<{ field: keyof ITestingChunk; label: string }> = [
  { field: 'similarity', label: 'Hybrid Similarity' },
  { field: 'term_similarity', label: 'Term Similarity' },
  { field: 'vector_similarity', label: 'Vector Similarity' },
];

const ChunkTitle = ({ item }: { item: ITestingChunk }) => {
  const { t } = useTranslate('knowledgeDetails');
  return (
    <Flex gap={10}>
      {similarityList.map((x) => (
        typeof item[x.field] === 'number' ? (
          <Space key={x.field}>
            <span style={{ color: '#306EFD', fontSize: 20 }} className={styles.similarityCircle}>
              {((item[x.field] as number) * 100).toFixed(2)}
            </span>
            <span className={styles.similarityText}>{t(camelCase(x.field))}</span>
          </Space>
        ) : null
      ))}
    </Flex>
  );
};

interface IProps {
  handleTesting: (documentIds?: string[]) => Promise<any>;
  selectedDocumentIds: string[];
  setSelectedDocumentIds: (ids: string[]) => void;
}

const TestingResult = ({
  handleTesting,
  selectedDocumentIds,
  setSelectedDocumentIds,
}: IProps) => {
  // const { documents,} = useSelectTestingResult();
  const { documents: documentsAll, total, chunks } = useAllTestingResult();
  const { t } = useTranslate('knowledgeDetails');
  const { pagination, setPagination } = useGetPaginationWithRouter();
  const isSuccess = useSelectIsTestingSuccess();
  // const isAllSuccess = useAllTestingSuccess();
  const onChange: PaginationProps['onChange'] = (pageNumber, pageSize) => {
    pagination.onChange?.(pageNumber, pageSize);
    handleTesting(selectedDocumentIds);
  };
  const onTesting = useCallback(
    (ids: string[]) => {
      setPagination({ page: 1 });
      handleTesting(ids);
    },
    [setPagination, handleTesting],
  );
  const [videoChunkInfo, setVideoChunkInfo] = useState<any[]>([]);
  // 新增：弹窗控制和当前视频信息
  const [modalVisible, setModalVisible] = useState(false);
  const [currentVideoInfo, setCurrentVideoInfo] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false); // 新增：控制视频是否正在播放

  // 弹窗打开后收集 chunks 的 id，调用 fetchVideoChunks
  useEffect(() => {
    if (isSuccess && chunks && chunks.length > 0) {
      const chunkIds = chunks.map((x) => x.id).filter(Boolean);
      if (chunkIds.length > 0) {
        (async () => {
          try {
            const { data } = await fetchVideoChunks(chunkIds as string[]);
            setVideoChunkInfo(data.data);
            console.log('fetchVideoChunks 返回:', data);
          } catch (e: any) {
            console.warn('获取视频分块信息失败', e);
          }
        })();
      } else {
        setVideoChunkInfo([]);
      }
    }
  }, [isSuccess, chunks]);

  // 时间字符串转秒，如 0:0:4:17 => 4
  const timeStrToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    // 处理"时:分:秒:毫秒"格式
    if (parts.length === 4) {
      const [hours, minutes, seconds, milliseconds] = parts;
      return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
    // 处理"时:分:秒"格式
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }

    return 0;
  };

  // 弹窗视频起止时间控制
  useEffect(() => {
    if (!modalVisible || !videoRef.current || !currentVideoInfo) return;
    const video = videoRef.current;
    const start = timeStrToSeconds(currentVideoInfo.start_time);
    const end = timeStrToSeconds(currentVideoInfo.end_time);
    console.log(`start,end`, start, end);
    const handleTimeUpdate = () => {
      if (video.currentTime >= end) {
        video.pause();
        video.currentTime = start;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [modalVisible, currentVideoInfo]);
  // 弹窗关闭时重置视频状态
  useEffect(() => {

    if (modalVisible) {
      // 弹窗刚打开，重置播放状态
      setIsPlaying(false);
      // 也可以重置视频 currentTime
      if (videoRef.current && currentVideoInfo) {
        const startSec = timeStrToSeconds(currentVideoInfo.start_time);
        videoRef.current.currentTime = startSec;
        videoRef.current.pause();
      }
    } else {
      // 弹窗刚关闭，重置播放状态
      setIsPlaying(false);
      if (videoRef.current && currentVideoInfo) {
        videoRef.current.pause();
        const startSec = timeStrToSeconds(currentVideoInfo.start_time);
        videoRef.current.currentTime = startSec;
      }
    }
  }, [modalVisible, currentVideoInfo]);
  const handlePlaySection = () => {
    if (videoRef.current && currentVideoInfo) {
      const startSec = timeStrToSeconds(currentVideoInfo.start_time);
      const endSec = timeStrToSeconds(currentVideoInfo.end_time);
      videoRef.current.currentTime = startSec;
      videoRef.current.play().catch(e => console.error('播放失败:', e));
      setIsPlaying(true);

      const handleTimeUpdate = () => {
        if (videoRef.current && videoRef.current.currentTime >= endSec) {
          videoRef.current.pause();
          videoRef.current.currentTime = startSec; // 可选：重置到开始位置
          setIsPlaying(false);
        }
      };

      videoRef.current.addEventListener('timeupdate', handleTimeUpdate);

      return () => {
        videoRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  };
  // 工具函数：将[IMG::xxxx]替换为Antd <Image>组件
  function renderContentWithImages(content: string) {
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

        <>
          <Image
            key={key++}
            src={`${api_rag_host}/file/download/${imgId}`}
            alt='图片'

            style={{ maxWidth: 120, maxHeight: 120, margin: '0 4px', verticalAlign: 'middle' }}
            preview={true}
          />
          <br key={key++} />
        </>
      );
      lastIndex = match.index + match[0].length;
    }
    // 剩余文本
    if (lastIndex < content.length) {
      parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
    }
    return parts;
  }

  return (
    <section className={styles.testingResultWrapper}>
      <Collapse
        expandIcon={() => (
          <SelectedFilesCollapseIcon></SelectedFilesCollapseIcon>
        )}
        className={styles.selectFilesCollapse}
        items={[
          {
            key: '1',
            label: (
              <Flex
                justify={'space-between'}
                align="center"
                className={styles.selectFilesTitle}
              >
                <Space>
                  <span>
                    {selectedDocumentIds?.length ?? 0}/
                    {documentsAll?.length ?? 0}
                  </span>
                  {t('filesSelected')}
                </Space>
              </Flex>
            ),
            children: (
              <div>
                <SelectFiles
                  setSelectedDocumentIds={setSelectedDocumentIds}
                  handleTesting={onTesting}
                ></SelectFiles>
              </div>
            ),
          },
        ]}
      />
      <div className={styles.resultContent}>
        <Flex
          gap={'large'}
          vertical
          flex={1}
        >
          {isSuccess && chunks?.length > 0 ? (
            chunks?.map((x) => {
              const videoInfo = Array.isArray(videoChunkInfo) ? videoChunkInfo.find((v) => v.id === x.id) : null;
              return (
                <Card key={String(x.chunk_id)} title={<ChunkTitle item={x} />}>
                  <div className="flex justify-center">
                    {showImage(x.doc_type_kwd) && (
                      <Image
                        id={x.image_id}
                        className={'object-contain max-h-[30vh] w-full text-center'}
                        src={`/api/file/downloadImage?imageId=${x.image_id}`}
                      ></Image>
                    )}
                  </div>
                  <div className="pt-4" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexDirection: 'column' }}>
                    {/* 渲染内容时去除所有 '[{chunk_id:...}]' 结构的文本 */}
                    <div style={{ flex: 1 }}>
                      {x.content_ltks
                        ? renderContentWithImages(x.content_ltks.replace(/\[\{chunk_id:[^}]+\}\]/g, ''))
                        : ''}
                    </div>
                    {/* 渲染视频封面，点击弹窗播放指定区间 */}
                    {videoInfo && videoInfo.doc_id && (
                      <div
                        style={{
                          position: 'relative',
                          cursor: 'pointer',
                          width: 200,
                          height: 100,
                          borderRadius: 8,
                          overflow: 'hidden'
                        }}
                        onClick={() => {
                          // const { data } = await getMinioDownloadUrl(videoInfo.doc_id)
                          // const videoUrl = data.data.replace('http://localhost:9000', 'http://119.84.128.68:6581/minio');
                          setCurrentVideoInfo({
                            ...videoInfo,
                            videoUrl: `/api/file/download/${videoInfo.doc_id}`,
                            content_ltks: x.content_ltks
                          });
                          setModalVisible(true);
                        }}
                      >
                        <img
                         src= {`/api/file/download/${videoInfo.cover_id}`}
                          alt="视频封面"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 8
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 24,
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: 8
                        }}>
                          ▶
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          ) : isSuccess && chunks?.length === 0 ? (
            <Empty></Empty>
          ) : null}
        </Flex>
      </div>
      {/* 视频弹窗 */}
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
         {currentVideoInfo && (
          <div style={{ textAlign: 'center' }}>
            <video
              ref={videoRef}
              src={currentVideoInfo.videoUrl}
              controls
              width="100%"
              // poster={currentVideoInfo.cover_url.replace('http://localhost:9000', 'http://119.84.128.68:6581/minio') || undefined}
              style={{ borderRadius: 8, background: '#000', maxHeight: '70vh' }}
            />

            {/* 渲染内容时去除所有 '[{chunk_id:...}]' 结构的文本 */}
            <div style={{ flex: 1,marginTop: 16  }}>
              {currentVideoInfo.content_ltks
                ? renderContentWithImages(currentVideoInfo.content_ltks.replace(/\[\{chunk_id:[^}]+\}\]/g, ''))
                : ''}
            </div>
            <div style={{ marginTop: 10,fontSize: 16,color: '#676767' }}>
              相关片段: {formatTimeDisplay(currentVideoInfo.start_time)} - {formatTimeDisplay(currentVideoInfo.end_time)}
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                style={{ padding: '8px 16px', fontSize: 16, borderRadius: 4, background: '#306EFD', color: '#fff', border: 'none', cursor: isPlaying ? 'not-allowed' : 'pointer' }}
                onClick={handlePlaySection}
                disabled={isPlaying}
              >
                {isPlaying ? '播放中...' : '播放相关片段'}
              </button>
            </div>
          </div>
        )}
      </Modal>
      <div className={styles.paginationWrapper}>
        <Pagination
          {...pagination}
          size={'small'}
          total={total}
          onChange={onChange}
        />
      </div>
    </section>
  );
};

export default TestingResult;

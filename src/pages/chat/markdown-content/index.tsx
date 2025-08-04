import MyImage from '@/components/image';
import SvgIcon from '@/components/svg-icon';
import { IReference, IReferenceChunk } from '@/interfaces/database/chat';
import { getExtension, formatTimeDisplay } from '@/utils/document-util';
import { InfoCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Popover, Image, Modal } from 'antd';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Spin } from 'antd';
import Markdown from 'react-markdown';
import reactStringReplace from 'react-string-replace';
import SyntaxHighlighter from 'react-syntax-highlighter';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { visitParents } from 'unist-util-visit-parents';
import { api_rag_host } from '@/utils/api';
import { useFetchDocumentThumbnailsByIds } from '@/hooks/document-hooks';
import { useTranslation } from 'react-i18next';
import { fetchVideoChunks } from '@/services/knowledge-service';
import { getAuthorization } from '@/utils/authorization-util';

import 'katex/dist/katex.min.css'; // `rehype-katex` does not import the CSS for you

import {
  isImageFile,
  preprocessLaTeX,
  replaceThinkToSection,
  showImage,
} from '@/utils/chat';
import { currentReg, replaceTextByOldReg } from '../utils';

import classNames from 'classnames';
import { pipe } from 'lodash/fp';
import styles from './index.less';

const getChunkIndex = (match: string) => Number(match.slice(2, -2));
// TODO: The display of the table is inconsistent with the display previously placed in the MessageItem.
const MarkdownContent = ({
  reference,
  clickDocumentButton,
  content,
}: {
  content: string;
  loading: boolean;
  reference: IReference;
  clickDocumentButton?: (documentId: string, chunk: IReferenceChunk) => void;
}) => {
  console.log(`content@@@@@@@@@@@@@@@@@@@@@@@@@`, content);
  const { t } = useTranslation();
  const { setDocumentIds, data: fileThumbnails } =
    useFetchDocumentThumbnailsByIds();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentVideoInfo, setCurrentVideoInfo] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  const contentWithCursor = useMemo(() => {
    // let text = DOMPurify.sanitize(content);
    let text = content;
    if (text === '') {
      text = t('chat.searching');
    }
    const nextText = replaceTextByOldReg(text);
    console.log(`nextText`, nextText);

    // 预处理 IMG:: 格式，将其转换为标准 URL 格式
    const processedText = nextText.replace(/!\[([^\]]*)\]\(IMG::([a-zA-Z0-9]+)\)/g, (match, alt, imgId) => {
      return `![${alt}](${api_rag_host}/file/download/${imgId})`;
    });

    // 预处理 [{chunk_id:xxx}] 格式，将其转换为视频按钮
    const processedTextWithVideos = processedText.replace(/\[\{chunk_id:([a-zA-Z0-9]+)\}\]/g, (match, chunkId) => {
      return `<video-button chunk-id="${chunkId}">查看视频</video-button>`;
    });

    return pipe(replaceThinkToSection, preprocessLaTeX)(processedTextWithVideos);
  }, [content, t]);
  console.log(`contentWithCursor`, contentWithCursor);
  useEffect(() => {
    const docAggs = reference?.doc_aggs;
    setDocumentIds(Array.isArray(docAggs) ? docAggs.map((x) => x.doc_id) : []);
  }, [reference, setDocumentIds]);

  // 时间字符串转秒
  const timeStrToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 4) {
      const [hours, minutes, seconds, milliseconds] = parts;
      return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  };



  // 处理视频播放
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
          videoRef.current.currentTime = startSec;
          setIsPlaying(false);
        }
      };

      videoRef.current.addEventListener('timeupdate', handleTimeUpdate);
      return () => {
        videoRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  };

  // 弹窗关闭时重置视频状态
  useEffect(() => {
    if (modalVisible) {
      setIsPlaying(false);
      if (videoRef.current && currentVideoInfo) {
        const startSec = timeStrToSeconds(currentVideoInfo.start_time);
        videoRef.current.currentTime = startSec;
        videoRef.current.pause();
      }
    } else {
      setIsPlaying(false);
      if (videoRef.current && currentVideoInfo) {
        videoRef.current.pause();
        const startSec = timeStrToSeconds(currentVideoInfo.start_time);
        videoRef.current.currentTime = startSec;
      }
    }
  }, [modalVisible, currentVideoInfo]);

  // 获取图片 blob URL
  const getImageBlobUrl = async (url: string): Promise<string> => {
    try {
      const token = getAuthorization();
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ragflow-${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('获取图片失败:', error);
      return url; // 失败时返回原始 URL
    }
  };

 
  const getUrlWithToken = (url: string) => {
    const token = getAuthorization();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=Bearer ragflow-${token}`;
  };


  const handleVideoClick = useCallback(async (chunkId: string, content: string, chunkItem?: any) => {
    console.log(`handleVideoClick///////////////////`, chunkId, content, chunkItem);
    setModalVisible(true);
    setIsLoadingVideo(true);
    setCurrentVideoInfo(null);
    try {
      const { data: videoData } = await fetchVideoChunks([chunkId]);
      if (videoData.data && videoData.data.length > 0) {
        const videoInfo = videoData.data[0];
        if (videoInfo.doc_id) {
          setCurrentVideoInfo({
            ...videoInfo,
            videoUrl: `/api/file/download/${videoInfo.doc_id}`,
            content_ltks: content, // 传入当前内容用于显示
            document_id: chunkItem?.document_id, // 保存文档ID用于未来扩展
            document_name: chunkItem?.document_name
          });
        }
      }
    } catch (error) {
      console.error('获取视频信息失败:', error);
      setModalVisible(false);
    } finally {
      setIsLoadingVideo(false);
    }
  }, []);

 
  const AuthenticatedImage = ({ src, alt, style, preview }: { src: string; alt: string; style?: any; preview?: boolean }) => {
    const [blobUrl, setBlobUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      const loadImage = async () => {
        try {
          setLoading(true);
          const url = await getImageBlobUrl(src);
          setBlobUrl(url);
        } catch (err) {
          console.error('加载图片失败:', err);
          setError(true);
        } finally {
          setLoading(false);
        }
      };

      loadImage();

     
      return () => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      };
    }, [src]);

    if (loading) {
      return <Spin size="small" />;
    }

    if (error) {
      return <span style={{ color: 'red' }}>图片加载失败</span>;
    }

    return (
      <Image
        src={blobUrl}
        alt={alt}
        style={style}
        preview={preview}
      />
    );
  };

  
  function renderContentWithImagesAndVideos(content: string, chunkItem?: any) {
    if (!content) return null;
    const parts = [];
    let lastIndex = 0;
    // 匹配[{chunk_id:xxx}]或[IMG::xxx]
    const regex = /\[\{chunk_id:([a-zA-Z0-9]+)\}\]|\[IMG::([a-zA-Z0-9]+)\]/g;
    let match;
    let key = 0;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{content.slice(lastIndex, match.index)}</span>);
      }
      if (match[1]) {
        // 视频按钮
        const chunkId = match[1];
        parts.push(

          <div
            style={{
              position: 'relative',
              cursor: 'pointer',
              width: 200,
              height: 100,
              borderRadius: 8,
              overflow: 'hidden'
            }}
            key={key++}
            onClick={() => handleVideoClick(chunkId, content, chunkItem)}
          >

            <AuthenticatedImage
              src={`/api/file/getFirstFrameByChunkId?chunkId=${chunkId}`}
              alt="视频封面" style={{
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
            }} >
              ▶
            </div>
            <br />
          </div>


        );
      } else if (match[2]) {
        // 图片
        const imgId = match[2];
        parts.push(
          <div key={key++}>
            <Image
              src={`${api_rag_host}/file/download/${imgId}`}
              alt='图片'
              style={{ maxWidth: 120, maxHeight: 120, margin: '0 4px', verticalAlign: 'middle' }}
              preview={true}
            />
            <br />
          </div>
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
    }
    return parts;
  }

  const handleDocumentButtonClick = useCallback(
    (
      documentId: string,
      chunk: IReferenceChunk,
      isPdf: boolean,
      documentUrl?: string,
    ) =>
      () => {
        console.log(`********handleDocumentButtonClick**********`, documentId, chunk, isPdf, documentUrl);
        if (!isPdf) {
          if (!documentUrl) {
            if (chunk.document_name.includes('mp4')) {
              handleVideoClick(chunk.id, chunk.content, chunk)
              return;
            } else {
              return;
            }

          }

          window.open(documentUrl, '_blank');
        } else {

          clickDocumentButton?.(documentId, chunk);
        }
      },
    [clickDocumentButton, handleVideoClick],
  );

  const rehypeWrapReference = () => {
    return function wrapTextTransform(tree: any) {
      visitParents(tree, 'text', (node, ancestors) => {
        const latestAncestor = ancestors.at(-1);
        if (
          latestAncestor.tagName !== 'custom-typography' &&
          latestAncestor.tagName !== 'code'
        ) {
          node.type = 'element';
          node.tagName = 'custom-typography';
          node.properties = {};
          node.children = [{ type: 'text', value: node.value }];
        }
      });
    };
  };

  // 判断是否为视频文件的函数
  const isVideoFile = useCallback((fileName?: string) => {
    if (!fileName) return false;
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
    const lowerFileName = fileName.toLowerCase();
    return videoExtensions.some(ext => lowerFileName.endsWith(ext));
  }, []);

  const getReferenceInfo = useCallback(
    (chunkIndex: number) => {
      console.log(`reference?.chunks`, reference?.chunks);
      const chunks = reference?.chunks ?? [];
      const chunkItem = chunks[chunkIndex];
      const document = reference?.doc_aggs?.find(
        (x) => x?.doc_id === chunkItem?.document_id,
      );
      console.log(`--------document--------`, document);
      const documentId = document?.doc_id;
      const documentUrl = document?.url;
      const fileThumbnail = documentId ? fileThumbnails[documentId] : '';
      const fileExtension = documentId ? getExtension(document?.doc_name) : '';
      const imageId = chunkItem?.image_id;

      return {
        documentUrl,
        fileThumbnail,
        fileExtension,
        imageId,
        chunkItem,
        documentId,
        document,
      };
    },
    [fileThumbnails, reference?.chunks, reference?.doc_aggs],
  );

  const getPopoverContent = useCallback(
    (chunkIndex: number) => {
      const {
        documentUrl,
        fileThumbnail,
        fileExtension,
        imageId,
        chunkItem,
        documentId,
        document,
      } = getReferenceInfo(chunkIndex);
      // console.log(`getPopoverContent`, documentUrl, fileThumbnail, fileExtension, imageId, chunkItem, documentId, document);
      return (
        <div key={chunkItem?.id} className="flex gap-2">
          {imageId && (
            <Popover
              placement="left"
              content={
                <MyImage
                  id={imageId}
                  className={styles.referenceImagePreview}
                ></MyImage>
              }
            >
              <MyImage
                id={imageId}
                className={styles.referenceChunkImage}
              ></MyImage>
            </Popover>
          )}
          <div className={'space-y-2 max-w-[40vw]'}>
            {/* 提示内容 chunk内容 */}
            <div
              // dangerouslySetInnerHTML={{
              //   __html: DOMPurify.sanitize(
              //     chunkItem?.content ?? ''),
              // }}
              className={classNames(styles.chunkContentText)}
            >{renderContentWithImagesAndVideos(chunkItem?.content ?? '', chunkItem)}</div>
            {documentId && (
              <Flex gap={'small'} >
                {fileThumbnail ? (
                  <img
                    src={fileThumbnail}
                    alt=""
                    className={styles.fileThumbnail}
                  />
                ) : (
                  <SvgIcon
                    name={`file-icon/${fileExtension}`}
                    width={24}
                  ></SvgIcon>
                )}
                <Button
                  type="link"
                  className={classNames(styles.documentLink, 'text-wrap')}
                  onClick={handleDocumentButtonClick(
                    documentId,
                    chunkItem,
                    fileExtension === 'pdf',
                    documentUrl,
                  )}
                >
                  {document?.doc_name}
                </Button>
              </Flex>
            )}
          </div>
        </div>
      );
    },
    [getReferenceInfo, handleDocumentButtonClick],
  );

  const renderReference = useCallback(
    (text: string) => {
      console.log(`test---`, text);
      let replacedText = reactStringReplace(text, currentReg, (match, i) => {
        const chunkIndex = getChunkIndex(match);

        const { documentUrl, fileExtension, imageId, chunkItem, documentId, document } =
          getReferenceInfo(chunkIndex);

        const docType = chunkItem?.doc_type;
        // console.log(`docType,documentUrl, fileExtension, imageId, chunkItem, documentId`, docType, documentUrl, fileExtension, imageId, chunkItem, documentId);
        if (showImage(docType)) {
          return (
            <MyImage
              key={i}
              id={imageId}
              className={styles.referenceInnerChunkImage}
              type={fileExtension === 'pdf'}
              onClick={
                documentId
                  ? handleDocumentButtonClick(
                    documentId,
                    chunkItem,
                    fileExtension === 'pdf',
                    documentUrl,
                  )
                  : () => { console.log(`documentIdfalse`, documentId); }
              }
            />
          );
        } else if (isImageFile(document?.doc_name)) {
          return (
            <MyImage
              key={i}
              id={imageId}
              className={styles.referenceInnerChunkImage}
              type={fileExtension === 'pdf'}
              onClick={
                documentId
                  ? handleDocumentButtonClick(
                    documentId,
                    chunkItem,
                    fileExtension === 'pdf',
                    documentUrl,
                  )
                  : () => { console.log(`documentIdfalse`, documentId); }
              }
            />
          );
        } else {
          // 根据文档名称判断是否为视频文件
          const isVideo = isVideoFile(document?.doc_name);
          return (
            <Popover content={getPopoverContent(chunkIndex)} key={i}>
              {isVideo ? (
                <PlayCircleOutlined className={styles.referenceIcon} />
              ) : (
                <InfoCircleOutlined className={styles.referenceIcon} />
              )}
            </Popover>
          );
        }
      });

      // replacedText = reactStringReplace(replacedText, curReg, (match, i) => (
      //   <span className={styles.cursor} key={i}></span>
      // ));

      return replacedText;
    },
    [getPopoverContent, getReferenceInfo, handleDocumentButtonClick, isVideoFile],
  );

  // 折叠控制section.think（自定义section渲染，保证children走markdown逻辑）
  const [thinkOpen, setThinkOpen] = useState(true);
  const markdownComponents = useMemo(() => ({
    section: ({ className, children, ...rest }: { className?: string; children?: React.ReactNode }) => {
      if (className && className.includes('think')) {
        return (
          <div style={{ marginBottom: 16, marginTop: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                justifyContent: "space-between",
                background: '#f6f8fa',
                height: '40px',
                borderRadius: '6px',
              }}
              onClick={() => setThinkOpen(v => !v)}
            >
              <span style={{ marginLeft: 8, fontWeight: 500 }}>思考过程</span>
              <svg width="16" height="16" style={{ verticalAlign: 'middle', transition: 'transform 0.2s' }} viewBox="0 0 1024 1024">
                <path d={thinkOpen
                  ? 'M192 352l320 320 320-320z' // 向下
                  : 'M192 672l320-320 320 320z' // 向上
                } fill="#666" />
              </svg>
            </div>
            <section
              className={className}
              style={{
                display: thinkOpen ? 'block' : 'none',
                background: '#f6f8fa',
                padding: '0 12px 12px 12px',
                borderRadius: 5,
                transition: 'all 0.3s'
              }}
              {...rest}
            >
              {typeof children === 'string' ? renderContentWithImagesAndVideos(children) : children}
            </section>
          </div>
        );
      }
      // 其它 section 正常渲染
      return <section style={{ marginTop: 10 }} className={className} {...rest}>
        {typeof children === 'string' ? renderContentWithImagesAndVideos(children) : children}
      </section>;
    },
    'custom-typography': ({ children }: { children: string }) => {
      console.log(`children,custom-typography`, children);
      return renderReference(children)
    },
    // 处理普通文本中的图片
    p: ({ children, ...props }: any) => {
      console.log(`children,p.props`, children, props);
      if (typeof children === 'string') {
        return <p {...props}>{renderContentWithImagesAndVideos(children)}</p>;
      }
      return <p {...props}>{children}</p>;
    },
    // 处理 div 中的图片
    div: ({ children, ...props }: any) => {
      console.log(`children,.divprops`, children, props);
      if (typeof children === 'string') {
        return <div {...props}>{renderContentWithImagesAndVideos(children)}</div>;
      }
      return <div {...props}>{children}</div>;
    },
    // 处理 span 中的图片
    span: ({ children, ...props }: any) => {
      console.log(`children,spanprops`, children, props);
      if (typeof children === 'string') {
        return <span {...props}>{renderContentWithImagesAndVideos(children)}</span>;
      }
      return <span {...props}>{children}</span>;
    },
   
    img: ({ src, alt, ...props }: any) => {
      console.log(`img src, alt`, src, alt, props);
     
      return (
        <Image
          src={src}
          alt={alt || '图片'}
          style={{ maxWidth: 120, maxHeight: 120, margin: '0 4px', verticalAlign: 'middle' }}
          preview={true}
        />
      );
    },
 
    'video-button': ({ 'chunk-id': chunkId, children }: any) => {
      console.log(`video-button chunkId`, chunkId);
      return (
        <Button
          type="primary"
          size="small"
          style={{ margin: '0 4px' }}
          onClick={() => handleVideoClick(chunkId, children || '', null)}
        >
          {children || '查看视频'}
        </Button>
      );
    },


    code(props: any) {
      const { children, className, ...rest } = props;
      const match = /language-(\w+)/.exec(className || '');
      return match ? (
        <SyntaxHighlighter
          {...rest}
          PreTag="div"
          language={match[1]}
          wrapLongLines
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code {...rest} className={classNames(className, 'text-wrap')}>
          {children}
        </code>
      );
    },
  }), [renderContentWithImagesAndVideos, thinkOpen, renderReference]);

  return (
    <div>
      <Markdown
        rehypePlugins={[rehypeWrapReference, rehypeKatex, rehypeRaw]}
        remarkPlugins={[remarkGfm, remarkMath]}
        className={styles.markdownContentWrapper}
        components={markdownComponents as any}
      >
        {contentWithCursor}
      </Markdown>
      {/* 视频弹窗 */}
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        title={`查看文件:${currentVideoInfo?.document_name}`}
        destroyOnHidden
        styles={{
          header: {
            textAlign: 'center'
          }
        }}
      >
        {isLoadingVideo ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>正在加载视频...</div>
          </div>
        ) : currentVideoInfo ? (
          <div style={{ textAlign: 'center' }}>
            <video
              ref={videoRef}
              src={currentVideoInfo.videoUrl}
              controls
              width="100%"
              style={{ borderRadius: 8, background: '#000', maxHeight: '70vh' }}
            />

            {/* 渲染内容时去除所有 '[{chunk_id:...}]' 结构的文本 */}
            <div style={{ flex: 1, marginTop: 16, fontSize: 16, textAlign: 'left' }}>
              {currentVideoInfo.content_ltks
                ? renderContentWithImagesAndVideos(currentVideoInfo.content_ltks.replace(/\[\{chunk_id:[^}]+\}\]/g, ''))
                : ''}
            </div>

            <div style={{ marginTop: 10, fontSize: 14, color: '#676767' }}>
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
        ) : null}
      </Modal>
    </div>
  );
};

export default MarkdownContent;

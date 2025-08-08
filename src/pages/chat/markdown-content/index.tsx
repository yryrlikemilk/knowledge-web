import MyImage from '@/components/image';
import SvgIcon from '@/components/svg-icon';
import { IReference, IReferenceChunk } from '@/interfaces/database/chat';
import { getExtension, formatTimeDisplay } from '@/utils/document-util';
import { InfoCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Popover, Image, Modal } from 'antd';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Spin } from 'antd';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
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

const getChunkIndex = (match: string) => {
  return Number(match)
};
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
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  // 新增：视频下载和加载状态控制
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // 时间字符串转秒，如 0:0:4:17 => 4.017
  const timeStrToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    console.log('时间转换:', timeStr, 'parts:', parts);

    // 处理"时:分:秒:毫秒"格式
    if (parts.length === 4) {
      const [hours, minutes, seconds, milliseconds] = parts;
      const totalSeconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
      console.log('4段格式转换结果:', totalSeconds);
      return totalSeconds;
    }
    // 处理"时:分:秒"格式
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      console.log('3段格式转换结果:', totalSeconds);
      return totalSeconds;
    }
    // 处理"分:秒"格式
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      const totalSeconds = minutes * 60 + seconds;
      console.log('2段格式转换结果:', totalSeconds);
      return totalSeconds;
    }

    console.log('无法解析时间格式:', timeStr);
    return 0;
  };

  // 下载视频文件
  useEffect(() => {
    if (modalVisible && currentVideoInfo && !videoBlob && !isDownloading) {
      const downloadVideo = async () => {
        try {
          setIsDownloading(true);
          setLoadingProgress(0);

          console.log('开始下载视频:', currentVideoInfo.videoUrl);

          const response = await fetch(currentVideoInfo.videoUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('无法获取响应流');
          }

          const contentLength = response.headers.get('content-length');
          const total = contentLength ? parseInt(contentLength, 10) : 0;
          let receivedLength = 0;
          const chunks: Uint8Array[] = [];

          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            chunks.push(value);
            receivedLength += value.length;

            if (total > 0) {
              const progress = (receivedLength / total) * 100;
              setLoadingProgress(progress);
              console.log(`下载进度: ${progress.toFixed(1)}%`);
            }
          }

          const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
          setVideoBlob(blob);
          setIsDownloading(false);
          setLoadingProgress(100);
          setIsVideoReady(true); // 下载完成后立即设置为准备就绪
          console.log('视频下载完成，大小:', blob.size, 'bytes');

        } catch (error) {
          console.error('视频下载失败:', error);
          setIsDownloading(false);
          setLoadingProgress(0);
        }
      };

      downloadVideo();
    }
  }, [modalVisible, currentVideoInfo, videoBlob, isDownloading]);

  // 初始化 Video.js 播放器
  useEffect(() => {
    console.log(`modalVisible: ${modalVisible}, currentVideoInfo: ${currentVideoInfo}, videoBlob: ${videoBlob}`);
    console.log('videoBlob size:', videoBlob?.size);
    if (!modalVisible || !currentVideoInfo || !videoBlob) {
      console.log('播放器初始化条件不满足，退出');
      return;
    }

    // 使用 requestAnimationFrame 确保 DOM 元素已经渲染
    const initPlayer = () => {
      console.log('initPlayer 被调用');
      if (!videoRef.current) {
        console.log('videoRef.current 仍然为 null，重试...');
        // 如果还没有渲染，继续等待
        requestAnimationFrame(initPlayer);
        return;
      }

      console.log('videoRef.current 已找到，开始初始化 Video.js');
      console.log('videoRef.current:', videoRef.current);

      // 销毁之前的播放器
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      // 声明定时器变量
      let progressInterval: NodeJS.Timeout | null = null;

      // 创建新的 Video.js 播放器
      let player;
      try {
        player = videojs(videoRef.current, {
          controls: true,
          fluid: false,
          responsive: false,
          preload: 'auto', // 改为 auto，确保视频完全加载
          playbackRates: [0.5, 1, 1.25, 1.5, 2],
          controlBar: {
            children: [
              'playToggle',
              'volumePanel',
              'currentTimeDisplay',
              'timeDivider',
              'durationDisplay',
              'progressControl',
              'remainingTimeDisplay',
              'playbackRateMenuButton',
              'fullscreenToggle'
            ]
          },
          sources: [{
            src: URL.createObjectURL(videoBlob),
            type: 'video/mp4'
          }]
        });
      } catch (error) {
        console.error('Video.js 播放器创建失败:', error);
        return;
      }

      console.log('Video.js 播放器创建成功:', player);

      playerRef.current = player;

      // 设置初始时间
      const start = timeStrToSeconds(currentVideoInfo.start_time);
      const end = timeStrToSeconds(currentVideoInfo.end_time);

      player.ready(() => {
        console.log('Video.js 播放器准备就绪');
        setIsVideoLoading(false); // 播放器准备就绪，停止加载状态

        // 等待元数据加载完成后再设置时间
        player.on('loadedmetadata', () => {
          console.log('视频元数据加载完成，设置初始时间:', start);
          player.currentTime(start);
        });

        // 监听数据加载完成事件
        player.on('loadeddata', () => {
          console.log('视频数据加载完成，确保设置初始时间:', start);
          player.currentTime(start);
          console.log('当前播放时间:', player.currentTime());
          console.log('视频时长:', player.duration());
          console.log('缓冲状态:', player.buffered());
        });

        // 监听可以播放事件
        player.on('canplay', () => {
          try {
            console.log('视频可以播放，当前时间:', player.currentTime());
            console.log('视频时长:', player.duration());
            console.log('视频就绪状态:', player.readyState());
            // 由于视频已经下载完成，直接设置为准备就绪
            setIsVideoLoading(false);
            setIsVideoReady(true);
          } catch (error) {
            console.error('canplay 事件处理错误:', error);
          }
        });

        // 监听可以播放通过事件（更高级的缓冲状态）
        player.on('canplaythrough', () => {
          console.log('视频可以流畅播放，当前时间:', player.currentTime());
          // 由于视频已经下载完成，直接设置为准备就绪
          setIsVideoLoading(false);
          setIsVideoReady(true);
        });

        // 监听进度条拖动事件
        player.on('seeking', () => {
          try {
            const currentTime = player.currentTime();
            console.log('用户拖动进度条到:', currentTime);
            // 用户自由拖动，不进行任何纠正
          } catch (error) {
            console.error('seeking 事件处理错误:', error);
          }
        });

        // 监听时间更新
        player.on('timeupdate', () => {
          try {
            // 检查是否播放到结束时间
            if (player && typeof player.currentTime === 'function' && player.currentTime() >= end) {
              console.log('播放到结束时间，重新开始:', end);
              setTimeout(() => {
                try {
                  if (player && typeof player.pause === 'function') {
                    player.pause();
                  }
                  if (player && typeof player.currentTime === 'function') {
                    player.currentTime(start);
                  }
                  setIsPlaying(false); // 重置播放状态
                } catch (error) {
                  console.error('时间更新处理错误:', error);
                }
              }, 100);
            } else {
              // 用户自由播放，记录时间更新
              if (player && typeof player.currentTime === 'function') {
                console.log('播放时间更新:', player.currentTime());
              }
            }
          } catch (error) {
            console.error('timeupdate 事件处理错误:', error);
          }
        });

        // 监听播放开始事件
        player.on('play', () => {
          try {
            console.log('播放开始，当前时间:', player.currentTime());
            // 使用 setTimeout 延迟设置状态，避免 DOM 冲突
            setTimeout(() => {
              setIsPlaying(true); // 设置播放状态
            }, 50);
            // 用户自由播放，不进行任何时间纠正
          } catch (error) {
            console.error('play 事件处理错误:', error);
          }
        });

        // 监听进度事件（视频加载中）
        player.on('progress', () => {
          console.log('视频加载进度，当前时间:', player.currentTime());
          // 由于视频已经下载完成，不需要再检查缓冲状态
          setIsVideoLoading(false);
          setIsVideoReady(true);
        });

        // 监听播放暂停事件
        player.on('pause', () => {
          console.log('播放暂停');
          // 使用 setTimeout 延迟设置状态，避免 DOM 冲突
          setTimeout(() => {
            setIsPlaying(false); // 重置播放状态
          }, 50);
        });

        // 监听播放结束事件
        player.on('ended', () => {
          console.log('播放结束');
          // 使用 setTimeout 延迟设置状态，避免 DOM 冲突
          setTimeout(() => {
            setIsPlaying(false); // 重置播放状态
          }, 50);
        });

        // 确保控制栏可见
        setTimeout(() => {
          const videoElement = player.el() as HTMLElement;
          if (videoElement) {
            // 添加自定义样式
            videoElement.style.position = 'relative';
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';

            const controlBar = videoElement.querySelector('.vjs-control-bar');
            const progressBar = videoElement.querySelector('.vjs-progress-control');
            const playButton = videoElement.querySelector('.vjs-play-control');

            if (controlBar) {
              (controlBar as HTMLElement).style.display = 'flex';
              (controlBar as HTMLElement).style.visibility = 'visible';
              (controlBar as HTMLElement).style.opacity = '1';
              (controlBar as HTMLElement).style.position = 'absolute';
              (controlBar as HTMLElement).style.bottom = '0';
              (controlBar as HTMLElement).style.left = '0';
              (controlBar as HTMLElement).style.right = '0';
              (controlBar as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.7)';
            }
            if (progressBar) {
              (progressBar as HTMLElement).style.display = 'block';
              (progressBar as HTMLElement).style.visibility = 'visible';
            }
            if (playButton) {
              (playButton as HTMLElement).style.display = 'block';
              (playButton as HTMLElement).style.visibility = 'visible';
            }
          }
        }, 100);
      });

      // 清理函数
      return () => {
        try {
          if (playerRef.current) {
            // 先移除所有事件监听器
            playerRef.current.off();
            // 然后销毁播放器
            playerRef.current.dispose();
            playerRef.current = null;
          }
          // 清理定时器
          if (progressInterval) {
            clearInterval(progressInterval);
          }
        } catch (error) {
          console.error('播放器清理错误:', error);
        }
      };
    };

    // 开始初始化
    requestAnimationFrame(initPlayer);

    // 清理函数
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [modalVisible, currentVideoInfo, videoBlob]);

  // 弹窗关闭时重置视频状态
  useEffect(() => {
    if (modalVisible) {
      // 弹窗刚打开，重置播放状态
      setIsPlaying(false);
      setIsVideoLoading(false);
      setIsVideoReady(false);
      setLoadingProgress(0);
      setVideoBlob(null);
      setIsDownloading(false);
    } else {
      // 弹窗刚关闭，重置播放状态
      setIsPlaying(false);
      setIsVideoLoading(false);
      setIsVideoReady(false);
      setLoadingProgress(0);
      setVideoBlob(null);
      setIsDownloading(false);
      // 销毁播放器
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    }
  }, [modalVisible, currentVideoInfo]);

  // 处理视频播放
  const handlePlaySection = () => {
    console.log('handlePlaySection 被调用');
    console.log('playerRef.current:', !!playerRef.current);
    console.log('currentVideoInfo:', !!currentVideoInfo);
    console.log('videoBlob:', !!videoBlob);
    console.log('isVideoReady:', isVideoReady);

    if (playerRef.current && currentVideoInfo && videoBlob && isVideoReady) {
      const startSec = timeStrToSeconds(currentVideoInfo.start_time);
      const endSec = timeStrToSeconds(currentVideoInfo.end_time);

      console.log(`Video.js 播放片段:`, startSec, '到', endSec);
      console.log('播放器状态:', playerRef.current.readyState());

      // 确保播放器已准备就绪
      if (playerRef.current.readyState() >= 1) {
        // 使用 Video.js API 设置时间和播放
        console.log('设置播放时间:', startSec);
        playerRef.current.currentTime(startSec);

        // 延迟一点时间确保时间设置生效
        setTimeout(() => {
          console.log('当前播放时间:', playerRef.current.currentTime());
          playerRef.current.play().then(() => {
            console.log('Video.js 开始播放');
          }).catch((e: any) => {
            console.error('Video.js 播放失败:', e);
            setIsPlaying(false);
          });
        }, 200);
      } else {
        console.log('播放器未准备就绪，等待元数据加载...');
        // 等待元数据加载完成
        playerRef.current.one('loadedmetadata', () => {
          console.log('设置播放时间:', startSec);
          playerRef.current.currentTime(startSec);

          // 再等待数据加载完成
          playerRef.current.one('loadeddata', () => {
            console.log('数据加载完成，再次设置时间:', startSec);
            playerRef.current.currentTime(startSec);

            setTimeout(() => {
              console.log('当前播放时间:', playerRef.current.currentTime());
              playerRef.current.play().then(() => {
                console.log('Video.js 开始播放');
              }).catch((e: any) => {
                console.error('Video.js 播放失败:', e);
                setIsPlaying(false);
              });
            }, 200);
          });
        });
      }
    } else if (isDownloading) {
      console.log('视频正在下载中，请稍候...');
    } else if (isVideoLoading) {
      console.log('视频正在加载中，请稍候...');
    } else if (!videoBlob) {
      console.log('视频尚未下载完成，请等待下载...');
    } else if (!isVideoReady) {
      console.log('视频尚未准备就绪，请等待加载完成...');
    }
  };

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
      console.log(`getPopoverContent-------------------chunkIndex`, chunkIndex,
        documentUrl, fileThumbnail, fileExtension,
        imageId, chunkItem, documentId, document);
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
        let chunkIndex = getChunkIndex(match);
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
        onCancel={() => {
          setModalVisible(false);
          // 销毁播放器
          if (playerRef.current) {
            playerRef.current.dispose();
            playerRef.current = null;
          }
        }}
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
            <div style={{
              borderRadius: 8,
              overflow: 'hidden',
              backgroundColor: '#000',
              height: '400px',
              width: '100%',
              position: 'relative',
              marginBottom: '16px'
            }}>
              {/* 视频未加载完成时显示封面图和加载文字 */}
              {(!videoBlob || isDownloading || !isVideoReady || isVideoLoading) ? (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  zIndex: 10,
                  color: '#fff',
                  fontSize: 16,
                  flexDirection: 'column'
                }}>

                  <AuthenticatedImage
                    src={currentVideoInfo?.id ? `/api/file/getFirstFrameByChunkId?chunkId=${currentVideoInfo.id}` : ''}
                    alt="视频封面" style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 8
                    }}
                    preview={false}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    zIndex: 11
                  }}>视频加载中...</div>
                </div>
              ) : null}
              {/* 加载完成后显示视频 */}
              <video
                ref={videoRef}
                className="video-js vjs-default-skin vjs-big-play-centered"
                  data-setup="{}"
                  
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#000'
                }}
              />
            </div>
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
                style={{
                  padding: '8px 16px',
                  fontSize: 16,
                  borderRadius: 4,
                  background: (!videoBlob || isDownloading || !isVideoReady || isVideoLoading) ? '#ccc' : '#306EFD',
                  color: '#fff',
                  border: 'none',
                  cursor: (isPlaying || isVideoLoading || !isVideoReady || isDownloading || !videoBlob) ? 'not-allowed' : 'pointer'
                }}
                onClick={handlePlaySection}
                disabled={isPlaying || isVideoLoading || !isVideoReady || isDownloading || !videoBlob}
              >
                {isDownloading ? '正在下载视频...' : isVideoLoading ? '视频加载中...' : !videoBlob ? '等待视频下载...' : !isVideoReady ? '等待视频准备...' : isPlaying ? '播放中...' : '播放相关片段'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default MarkdownContent;

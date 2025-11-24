import {
  getExtension,
  isSupportedPreviewDocumentType,
} from '@/utils/document-util';
import React, { useState, useRef, useEffect } from 'react';
import { Modal, Image, Alert } from 'antd';
import Docx from '@/pages/document-viewer/docx';
import MyImage from '@/pages/document-viewer/image';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
// import { getMinioDownloadUrl } from '@/services/knowledge-service';
interface IProps extends React.PropsWithChildren {
  link?: string;
  preventDefault?: boolean;
  color?: string;
  documentName: string;
  documentId?: string;
  prefix?: string;
  className?: string;
  clickDocumentButton?: (documentId: string, chunk: any) => void;
}

const NewDocumentLink = ({
  children,
  link,
  preventDefault = false,
  color = 'rgb(15, 79, 170)',
  documentId,
  documentName,
  prefix = 'file',
  className,
  clickDocumentButton,
}: IProps) => {
  let nextLink = link;
  const extension = getExtension(documentName);
  if (!link) {
    nextLink = `/document/${documentId}?ext=${extension}&prefix=${prefix}`;
  }

  const [modalVisible, setModalVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [docUrl, setDocUrl] = useState<string | undefined>(undefined);
  const [docxPath, setDocxPath] = useState<string | undefined>(undefined);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  // 检查是否为图片格式
  const isImageFile = (filename: string) => {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
    const lowerFilename = filename.toLowerCase();
    return imageExtensions.some(ext => lowerFilename.endsWith(ext));
  };

  // 检查是否为视频格式
  const isVideoFile = (filename: string) => {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    const lowerFilename = filename.toLowerCase();
    return videoExtensions.some(ext => lowerFilename.endsWith(ext));
  };

  // 检查是否为PDF格式
  const isPdfFile = (filename: string) => {
    const lowerFilename = filename.toLowerCase();
    return lowerFilename.endsWith('.pdf');
  };
  // 检查是否为Word文档
  const isDocFile = (filename: string) => {
    const lowerFilename = filename.toLowerCase();
    return lowerFilename.endsWith('.doc') || lowerFilename.endsWith('.docx');
  };
  // 初始化 Video.js 播放器
  useEffect(() => {
    console.log(`modalVisible: ${modalVisible}, videoUrl: ${videoUrl}, isVideoFile: ${isVideoFile(documentName)}`);
    if (!modalVisible || !videoUrl || !isVideoFile(documentName)) return;

    // 使用 requestAnimationFrame 确保 DOM 元素已经渲染
    const initPlayer = () => {
      if (!videoRef.current) {
        console.log('videoRef.current 仍然为 null，重试...');
        // 如果还没有渲染，继续等待
        requestAnimationFrame(initPlayer);
        return;
      }

      console.log('videoRef.current 已找到，开始初始化 Video.js');

      // 销毁之前的播放器
      if (playerRef.current) {
        playerRef.current.dispose();
        videoRef.current?.removeAttribute('src');
        videoRef.current?.load();
        playerRef.current = null;
      }

      // 创建新的 Video.js 播放器
      const player = videojs(videoRef.current, {
        controls: true,
        fluid: false,
        responsive: false,
        preload: 'auto',
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
          src: videoUrl,
          type: 'video/mp4'
        }]
      });

      console.log('NewDocumentLink Video.js 播放器创建成功:', player);

      playerRef.current = player;

      player.ready(() => {
        console.log('NewDocumentLink Video.js 播放器准备就绪');

        // 监听数据加载完成事件
        player.on('loadeddata', () => {
          console.log('视频数据加载完成');
        });

        // 监听可以播放事件
        player.on('canplay', () => {
          console.log('视频可以播放，当前时间:', player.currentTime());
        });

        // 监听进度事件
        player.on('progress', () => {
          console.log('视频加载进度，当前时间:', player.currentTime());
        });

        // 监听等待事件
        player.on('waiting', () => {
          console.log('视频等待数据加载...');
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
  }, [modalVisible, videoUrl, documentName]);

  const handleClick = async (e: React.MouseEvent) => {
    if (documentId && (isVideoFile(documentName) || isImageFile(documentName) || isPdfFile(documentName) || isDocFile(documentName))) {
      e.preventDefault();

      // PDF文件使用clickDocumentButton
      if (isPdfFile(documentName)) {
        clickDocumentButton?.(documentId, {} as any);
        return;
      }
      // DOC/DOCX 预览
      if (isDocFile(documentName)) {
        setModalVisible(true);
        setLoading(true);
        try {
          const lower = documentName.toLowerCase();
          if (lower.endsWith('.docx')) {
            setDocxPath(`/v1/file/get/${documentId}`);
          } else {
            setDocxPath(undefined);
            setDocUrl(undefined);
          }
        } finally {
          setLoading(false);
        }
        return;
      }
      // 图片和视频文件使用弹窗
      setModalVisible(true);
      setLoading(true);
      if (isVideoFile(documentName)) {
        // try {
        //   const { data } = await getMinioDownloadUrl([documentId]);
        //   let url = data.data;
        //   url = url.replace('http://localhost:9000', 'http://119.84.128.68:6581/minio');
        //   setVideoUrl(url);
        // } catch (err) {
        //   setVideoUrl(undefined);
        // } finally {
        //   setLoading(false);
        // }
        const url = `/api/file/download/${documentId}`;
        setVideoUrl(url);
        setLoading(false);
      } else {
        // 图片文件直接使用documentId构建URL

        const imageUrl = `v1/${prefix || 'file'}/get/${documentId}`;
        setVideoUrl(imageUrl);
        setLoading(false);
      }
    }
  };

  return (
    <>
      <a
        target="_blank"
        onClick={
          documentName && (isVideoFile(documentName) || isImageFile(documentName) || isDocFile(documentName))
            ? handleClick
            : (!preventDefault || isSupportedPreviewDocumentType(extension)
              ? undefined
              : (e) => e.preventDefault())
        }
        href={nextLink}
        rel="noreferrer"
        style={{ color: className ? '' : color, wordBreak: 'break-all' }}
        className={className}
      >
        {children}
      </a>
      <Modal
        title={`查看文件:${documentName}`}
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
        width={800}
        destroyOnHidden
        styles={{
          header: {
            textAlign: 'center'
          }
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
        ) :
          isDocFile(documentName) ?
            (
              <Docx filePath={docxPath || ''} />
            )
            : videoUrl ? (
              isImageFile(documentName) ? (
                <div className='flex justify-center py-4'>
                  <MyImage
                    src={videoUrl}
                  />
                </div>

              ) : (
                <div style={{
                  borderRadius: 8,
                  overflow: 'hidden',
                  backgroundColor: '#000',
                  height: '400px',
                  width: '100%',
                  position: 'relative'
                }}>
                  <video
                    ref={videoRef}
                    className="video-js vjs-default-skin vjs-big-play-centered"
                    data-setup="{}"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>加载失败</div>
            )}
      </Modal>
    </>
  );
};

export default NewDocumentLink;

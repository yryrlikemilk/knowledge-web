import {
  getExtension,
  isSupportedPreviewDocumentType,
} from '@/utils/document-util';
import React, { useState } from 'react';
import { Modal, Image } from 'antd';
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
    nextLink = `/api/file/download//${documentId}?ext=${extension}&prefix=${prefix}`;
  }

  const [modalVisible, setModalVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
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

  const handleClick = async (e: React.MouseEvent) => {
    if (documentId && (isVideoFile(documentName) || isImageFile(documentName) || isPdfFile(documentName))) {
      e.preventDefault();

      // PDF文件使用clickDocumentButton
      if (isPdfFile(documentName)) {
        clickDocumentButton?.(documentId, {} as any);
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
        const imageUrl = `/api/file/download/${documentId}`;
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
          documentName && (isVideoFile(documentName) || isImageFile(documentName) || isPdfFile(documentName))
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
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        destroyOnHidden
        styles={{
          header: {
            textAlign: 'center'
          }
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
        ) : videoUrl ? (
          isImageFile(documentName) ? (
            <Image
              src={videoUrl}
              alt={documentName}
              style={{ width: '100%', height: 'auto' }}
            />
          ) : (
            <video
              src={videoUrl}
              crossOrigin="anonymous"
              controls
              muted
              playsInline
              width="100%"
              style={{ borderRadius: 8, background: '#000',maxHeight:'75vh' }}
            />
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>加载失败</div>
        )}
      </Modal>
    </>
  );
};

export default NewDocumentLink;

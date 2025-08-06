import { useTranslate } from '@/hooks/common-hooks';
import { IModalProps } from '@/interfaces/common';
import { InboxOutlined } from '@ant-design/icons';
import {
  Checkbox,
  Flex,
  Modal,
  Progress,
  Tabs,
  TabsProps,
  Upload,
  UploadFile,
  UploadProps,
} from 'antd';
import { Dispatch, SetStateAction, useState } from 'react';

import styles from './index.less';

const { Dragger } = Upload;

interface FileUploadProps {
  directory: boolean;
  fileList: UploadFile[];
  setFileList: Dispatch<SetStateAction<UploadFile[]>>;
  uploadProgress?: number;
  accept?: string;
  uploadLimitTip?: string;
}

const FileUpload = ({
  directory,
  fileList,
  setFileList,
  uploadProgress,
  accept,
  uploadLimitTip,
}: FileUploadProps) => {
  const { t } = useTranslate('fileManager');
  const props: UploadProps = {
    multiple: true,
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file: UploadFile) => {
      setFileList((pre) => {
        return [...pre, file];
      });
      return false;
    },
    directory,
    fileList,
    progress: {
      strokeWidth: 2,
    },
    accept, // 使用 accept
  };

  return (
    <>
      <Progress percent={uploadProgress} showInfo={false} />
      <Dragger {...props} className={styles.uploader}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t('uploadTitle')}</p>
        <p className="ant-upload-hint">{t('uploadDescription') + uploadLimitTip}</p>
        {false && <p className={styles.uploadLimit}>{t('uploadLimit')}</p>}
      </Dragger>
    </>
  );
};

interface IFileUploadModalProps
  extends IModalProps<
    { parseOnCreation: boolean; directoryFileList: UploadFile[] } | UploadFile[]
  > {
  uploadFileList?: UploadFile[];
  setUploadFileList?: Dispatch<SetStateAction<UploadFile[]>>;
  uploadProgress?: number;
  setUploadProgress?: Dispatch<SetStateAction<number>>;
}

const FileUploadModal = ({
  visible,
  hideModal,
  loading,
  onOk: onFileUploadOk,
  uploadFileList: fileList,
  setUploadFileList: setFileList,
  uploadProgress,
  setUploadProgress,
}: IFileUploadModalProps) => {
  const { t } = useTranslate('fileManager');
  const [value] = useState<string | number>('local');
  const [parseOnCreation, setParseOnCreation] = useState(false);
  const [currentFileList, setCurrentFileList] = useState<UploadFile[]>([]);
  const [directoryFileList, setDirectoryFileList] = useState<UploadFile[]>([]);

  const clearFileList = () => {
    if (setFileList) {
      setFileList([]);
      setUploadProgress?.(0);
    } else {
      setCurrentFileList([]);
    }
    setDirectoryFileList([]);
  };

  const onOk = async () => {
    if (uploadProgress === 100) {
      hideModal?.();
      return;
    }

    const ret = await onFileUploadOk?.(
      fileList
        ? { parseOnCreation, directoryFileList }
        : [...currentFileList, ...directoryFileList],
    );
    return ret;
  };

  const afterClose = () => {
    clearFileList();
  };

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: t('file'),
      children: (
        <FileUpload
          directory={false}
          fileList={fileList ? fileList : currentFileList}
          setFileList={setFileList ? setFileList : setCurrentFileList}
          uploadProgress={uploadProgress}
          accept={'.docx,.xlsx,.xls,.ppt,.pdf,.txt,.jpeg,.jpg,.png,.tif,.gif,.csv,.json,.eml,.html,.mp3,.mp4'}
          uploadLimitTip={'仅支持DOCX、XLSX、XLS、PPT、PDF、TXT、JPEG、JPG、PNG、TIF、GIF、CSV、JSON、EML、HTML、MP3、MP4文件格式'}
        ></FileUpload>
      ),
    },
    {
      key: '2',
      label: t('directory'),
      children: (
        <FileUpload
          directory
          fileList={directoryFileList}
          setFileList={setDirectoryFileList}
          uploadProgress={uploadProgress}
        ></FileUpload>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <div style={{ width: '100%', borderBottom: "1px solid #E5E6EB", paddingBottom: '12px', paddingLeft: '20px' }}>
            <i style={{ height: '100%', borderLeft: "4px solid #0C7CFF", borderRadius: '4px' }}></i>
            <span className='pl-2 text-[16px] font-bold'> {t('uploadFile')}</span>
          </div>

        }
        open={visible}
        onOk={onOk}
        onCancel={hideModal}
        confirmLoading={loading}
        className={styles.myModal}
        afterClose={afterClose}
        cancelText="取消"
        okText="确认"
      >
        <Flex gap={'large'} vertical>
          {/* <Segmented
            options={[
              { label: t('local'), value: 'local' },
              // { label: t('s3'), value: 's3' },
            ]}
            block
            value={value}
            onChange={setValue}
          /> */}
          {value === 'local' ? (
            <>
              <Tabs defaultActiveKey="1" items={items} />
              <Checkbox
                checked={parseOnCreation}
                onChange={(e) => setParseOnCreation(e.target.checked)}
              >
                {t('parseOnCreation')}
              </Checkbox>
            </>
          ) : (
            t('comingSoon', { keyPrefix: 'common' })
          )}
        </Flex>
      </Modal>
    </>
  );
};

export default FileUploadModal;

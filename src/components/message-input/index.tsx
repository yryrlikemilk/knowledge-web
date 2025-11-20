import { useTranslate } from '@/hooks/common-hooks';
import {
  useDeleteDocument,
  useFetchDocumentInfosByIds,
  useRemoveNextDocument,
  useUploadAndParseDocument,
} from '@/hooks/document-hooks';
import { cn } from '@/lib/utils';
import { getExtension } from '@/utils/document-util';
import { formatBytes } from '@/utils/file-util';
import {
  CloseCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { GetProp, UploadFile } from 'antd';
import {
  Button,
  Card,
  Divider,
  Flex,
  Input,
  List,
  Space,
  Spin,
  Typography,
  Upload,
  UploadProps,
} from 'antd';
import get from 'lodash/get';
import { CircleStop, Paperclip, SendHorizontal } from 'lucide-react';
import {
  ChangeEventHandler,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import FileIcon from '../file-icon';
import styles from './index.less';

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];
const { Text } = Typography;

const { TextArea } = Input;

const getFileId = (file: UploadFile) => get(file, 'response.data.0');

const getFileIds = (fileList: UploadFile[]) => {
  const ids = fileList.reduce((pre, cur) => {
    return pre.concat(get(cur, 'response.data', []));
  }, []);

  return ids;
};

const isUploadSuccess = (file: UploadFile) => {
  const code = get(file, 'response.code');
  return typeof code === 'number' && code === 0;
};

interface IProps {
  disabled: boolean;
  value: string;
  sendDisabled: boolean;
  sendLoading: boolean;
  onPressEnter(documentIds: string[]): void;
  onInputChange: ChangeEventHandler<HTMLTextAreaElement>;
  conversationId: string;
  uploadMethod?: string;
  isShared?: boolean;
  showUploadIcon?: boolean;
  createConversationBeforeUploadDocument?(message: string): Promise<any>;
  stopOutputMessage?(): void;
}

const getBase64 = (file: FileType): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file as any);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const MessageInput = ({
  isShared = false,
  disabled,
  value,
  onPressEnter,
  sendDisabled,
  sendLoading,
  onInputChange,
  conversationId,
  showUploadIcon = true,
  createConversationBeforeUploadDocument,
  uploadMethod = 'upload_and_parse',
  stopOutputMessage,
}: IProps) => {
  const { t } = useTranslate('chat');
  const { removeDocument } = useRemoveNextDocument();
  const { deleteDocument } = useDeleteDocument();
  const { data: documentInfos, setDocumentIds } = useFetchDocumentInfosByIds();
  const { uploadAndParseDocument } = useUploadAndParseDocument(uploadMethod);
  const conversationIdRef = useRef(conversationId);

  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as FileType);
    }
  };

  const handleChange: UploadProps['onChange'] = async ({
    // fileList: newFileList,
    file,
  }) => {
    let nextConversationId: string = conversationId;
    if (createConversationBeforeUploadDocument) {
      const creatingRet = await createConversationBeforeUploadDocument(
        file.name,
      );
      if (creatingRet?.code === 0) {
        nextConversationId = creatingRet.data.id;
      }
    }
    setFileList((list) => {
      list.push({
        ...file,
        status: 'uploading',
        originFileObj: file as any,
      });
      return [...list];
    });
    const ret = await uploadAndParseDocument({
      conversationId: nextConversationId,
      fileList: [file],
    });
    setFileList((list) => {
      const nextList = list.filter((x) => x.uid !== file.uid);
      nextList.push({
        ...file,
        originFileObj: file as any,
        response: ret,
        percent: 100,
        status: ret?.code === 0 ? 'done' : 'error',
      });
      return nextList;
    });
  };

  const isUploadingFile = fileList.some((x) => x.status === 'uploading');

  const handlePressEnter = useCallback(async () => {
    if (isUploadingFile) return;
    const ids = getFileIds(fileList.filter((x) => isUploadSuccess(x)));

    onPressEnter(ids);
    setFileList([]);
  }, [fileList, onPressEnter, isUploadingFile]);

  const handleKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // check if it was shift + enter
      if (event.key === 'Enter' && event.shiftKey) return;
      if (event.key !== 'Enter') return;
      if (sendDisabled || isUploadingFile || sendLoading) return;

      event.preventDefault();
      handlePressEnter();
    },
    [sendDisabled, isUploadingFile, sendLoading, handlePressEnter],
  );

  const handleRemove = useCallback(
    async (file: UploadFile) => {
      const ids = get(file, 'response.data', []);
      // Upload Successfully
      if (Array.isArray(ids) && ids.length) {
        if (isShared) {
          await deleteDocument(ids);
        } else {
          await removeDocument(ids[0]);
        }
        setFileList((preList) => {
          return preList.filter((x) => getFileId(x) !== ids[0]);
        });
      } else {
        // Upload failed
        setFileList((preList) => {
          return preList.filter((x) => x.uid !== file.uid);
        });
      }
    },
    [removeDocument, deleteDocument, isShared],
  );

  const handleStopOutputMessage = useCallback(() => {
    stopOutputMessage?.();
  }, [stopOutputMessage]);

  const getDocumentInfoById = useCallback(
    (id: string) => {
      return documentInfos.find((x) => x.id === id);
    },
    [documentInfos],
  );

  useEffect(() => {
    const ids = getFileIds(fileList);
    setDocumentIds(ids);
  }, [fileList, setDocumentIds]);

  useEffect(() => {
    if (
      conversationIdRef.current &&
      conversationId !== conversationIdRef.current
    ) {
      setFileList([]);
    }
    conversationIdRef.current = conversationId;
  }, [conversationId, setFileList]);

  return (
    <Flex
      gap={1}
      vertical
      className={cn(styles.messageInputWrapper, 'dark:bg-black')}
    >
      <TextArea
        size="large"
        placeholder={t('sendPlaceholder')}
        value={value}
        allowClear
        disabled={disabled}
        style={{
          border: 'none',
          boxShadow: 'none',
          padding: '0px 10px',
          marginTop: 10,
          backgroundColor: '#fff',
        }}
        autoSize={{ minRows: 2, maxRows: 10 }}
        onKeyDown={handleKeyDown}
        onChange={onInputChange}
      />
      <Divider style={{ margin: '5px 30px 10px 0px' }} />
      <Flex justify="space-between" align="center">
        {fileList.length > 0 && (
          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 1,
              md: 1,
              lg: 1,
              xl: 2,
              xxl: 4,
            }}
            dataSource={fileList}
            className={styles.listWrapper}
            renderItem={(item) => {
              const id = getFileId(item);
              const documentInfo = getDocumentInfoById(id);
              const fileExtension = getExtension(documentInfo?.name ?? '');
              const fileName = item.originFileObj?.name ?? '';

              return (
                <List.Item>
                  <Card className={styles.documentCard}>
                    <Flex gap={10} align="center">
                      {item.status === 'uploading' ? (
                        <Spin
                          indicator={
                            <LoadingOutlined style={{ fontSize: 24 }} spin />
                          }
                        />
                      ) : item.status === 'error' ? (
                        <InfoCircleOutlined size={30}></InfoCircleOutlined>
                      ) : (
                        <FileIcon id={id} name={fileName}></FileIcon>
                      )}
                      <Flex vertical style={{ width: '90%' }}>
                        <Text
                          ellipsis={{ tooltip: fileName }}
                          className={styles.nameText}
                        >
                          <b> {fileName}</b>
                        </Text>
                        {item.status === 'error' ? (
                          t('uploadFailed')
                        ) : (
                          <>
                            {item.percent !== 100 ? (
                              t('uploading')
                            ) : !item.response ? (
                              t('parsing')
                            ) : (
                              <Space>
                                <span>{fileExtension?.toUpperCase()},</span>
                                <span>
                                  {formatBytes(
                                    getDocumentInfoById(id)?.size ?? 0,
                                  )}
                                </span>
                              </Space>
                            )}
                          </>
                        )}
                      </Flex>
                    </Flex>

                    {item.status !== 'uploading' && (
                      <span className={styles.deleteIcon}>
                        <CloseCircleOutlined
                          onClick={() => handleRemove(item)}
                        />
                      </span>
                    )}
                  </Card>
                </List.Item>
              );
            }}
          />
        )}
        <Flex
          gap={5}
          align="center"
          justify="flex-end"
          style={{
            paddingRight: 10,
            paddingLeft: 10,
            paddingBottom: 10,
            justifyContent: 'space-between',
            width: fileList.length > 0 ? '50%' : '100%',
          }}
        >
          {showUploadIcon ? (
            <Upload
              onPreview={handlePreview}
              onChange={handleChange}
              multiple={false}
              onRemove={handleRemove}
              showUploadList={false}
              beforeUpload={() => {
                return false;
              }}
            >
              <Button type="link" disabled={disabled}  >
                <svg className="size-4" xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" width="16" height="16" viewBox="0 0 16 16">
                  <defs>
                    <clipPath id="master_svg0_76_03249">
                      <rect x="0" y="0" width="16" height="16" rx="0" />
                    </clipPath>
                  </defs>
                  <g clipPath="url(#master_svg0_76_03249)">
                    <g>
                      <path d="M6.88411,15.7979L14.476,8.11735C17.1873,5.42243,15.6961,2.59276,14.476,1.51479C13.2558,0.302073,10.4089,-1.18014,7.69753,1.51479L1.05466,8.11735C-0.843304,10.0038,0.241245,12.025,1.05466,12.8335C1.86807,13.6419,3.9016,14.7199,5.79956,12.8335L12.4424,6.2309C12.9847,5.69192,13.1203,5.15293,13.1203,4.88344C13.1203,4.07497,12.578,3.53598,12.4424,3.40123C11.9002,2.86225,10.68,2.32327,9.59549,3.40123L2.95262,10.0038C2.68148,10.2733,2.68148,10.6775,2.95262,10.947C3.22376,11.2165,3.63046,11.2165,3.9016,10.947L10.5445,4.34446C10.9512,3.94022,11.2223,4.07497,11.4935,4.34446Q12.0357,4.7487,11.4935,5.28768L4.85058,11.8902C3.4949,13.2377,2.27478,12.1597,2.00364,11.8902C1.7325,11.6207,0.647952,10.408,2.00364,9.06057L8.64651,2.45801C10.9512,0.167327,13.2558,2.18852,13.3914,2.45801C13.6626,2.7275,15.6961,4.88344,13.3914,7.17413L5.93513,14.8547C5.664,15.1242,5.664,15.5284,5.93513,15.7979C6.20627,16.0674,6.61298,16.0674,6.88411,15.7979Z" fill="#313131" fillOpacity="0.5" />
                    </g>
                  </g>
                </svg>

              </Button>
            </Upload>
          ) : (<div></div>)}
          {sendLoading ? (
            <Button onClick={handleStopOutputMessage}>
              <CircleStop className="size-5" />
            </Button>
          ) : (
            <Button
              className={styles.btnBlue}
              type="primary"
              onClick={handlePressEnter}
              loading={sendLoading}
              disabled={sendDisabled || isUploadingFile || sendLoading}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >

              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" width="16" height="16" viewBox="0 0 16 16">
                <defs>
                  <clipPath id="master_svg0_76_06085">
                    <rect x="0" y="0" width="16" height="16" rx="0" />
                  </clipPath>
                </defs>
                <g clipPath="url(#master_svg0_76_06085)">
                  <g>
                    <path d="M0.760485,7.41125L4.17651,9.82363C4.53679,10.0769,5.03051,10.0369,5.33742,9.73033L10.2479,4.82561C10.5015,4.57238,10.9285,4.57238,11.182,4.82561C11.4356,5.07884,11.4356,5.50534,11.182,5.75857L6.27149,10.6633C5.96458,10.9698,5.9112,11.463,6.17808,11.8228L8.59331,15.2348C9.44732,16.4477,11.3155,16.1678,11.7825,14.755L15.9057,2.38658C16.3728,0.973805,15.025,-0.372328,13.6106,0.0941539L1.24086,4.22585C-0.173586,4.69233,-0.440462,6.55826,0.760485,7.41125Z"
                      fill="#FFFFFF" fillOpacity="1" />
                  </g>
                </g>
              </svg>
            </Button>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default memo(MessageInput);

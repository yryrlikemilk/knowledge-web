import { ReactComponent as ChatAppCube } from '@/assets/svg/chat-app-cube.svg';
import RenameModal from '@/components/rename-modal';
import { DeleteOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Divider,
  Dropdown,
  Flex,
  MenuProps,
  message,
  Space,
  Spin,
  Typography,
} from 'antd';
import { MenuItemProps } from 'antd/lib/menu/MenuItem';
import classNames from 'classnames';
import { useCallback, useState, useEffect, useRef } from 'react';
import ChatConfigurationModal from './chat-configuration-modal';
import ChatContainer from './chat-container';
import {
  useDeleteConversation,
  useDeleteDialog,
  useEditDialog,
  useHandleItemHover,
  useRenameConversation,
  useSelectDerivedConversationList,
} from './hooks';

import EmbedModal from '@/components/api-service/embed-modal';
import { useShowEmbedModal } from '@/components/api-service/hooks';
import { useTheme } from '@/components/theme-provider';
import { SharedFrom } from '@/constants/chat';
import {
  useClickConversationCard,
  useClickDialogCard,
  useFetchNextDialogList,
  useGetChatSearchParams,
} from '@/hooks/chat-hooks';
import { useTranslate } from '@/hooks/common-hooks';
import { useSetSelectedRecord } from '@/hooks/logic-hooks';
import { IDialog } from '@/interfaces/database/chat';
import styles from './index.less';
import { ReactComponent as Robot } from '@/assets/svg/chat/robot.svg';

const { Text } = Typography;

const Chat = () => {
  const { data: dialogList, loading: dialogLoading } = useFetchNextDialogList();
  const { onRemoveDialog } = useDeleteDialog();
  const { onRemoveConversation } = useDeleteConversation();
  const { handleClickDialog } = useClickDialogCard();
  const { handleClickConversation } = useClickConversationCard();
  const { dialogId, conversationId } = useGetChatSearchParams();
  const { theme } = useTheme();
  const {
    list: conversationList,
    addTemporaryConversation,
    loading: conversationLoading,
  } = useSelectDerivedConversationList();
  const { activated, handleItemEnter, handleItemLeave } = useHandleItemHover();
  const {
    activated: conversationActivated,
    handleItemEnter: handleConversationItemEnter,
    handleItemLeave: handleConversationItemLeave,
  } = useHandleItemHover();
  const {
    conversationRenameLoading,
    initialConversationName,
    onConversationRenameOk,
    conversationRenameVisible,
    hideConversationRenameModal,
    showConversationRenameModal,
  } = useRenameConversation();
  const {
    dialogSettingLoading,
    initialDialog,
    onDialogEditOk,
    dialogEditVisible,
    clearDialog,
    hideDialogEditModal,
    showDialogEditModal,
  } = useEditDialog();
  const { t } = useTranslate('chat');
  const { currentRecord, setRecord } = useSetSelectedRecord<IDialog>();
  const [controller, setController] = useState(new AbortController());
  const { showEmbedModal, hideEmbedModal, embedVisible, beta } =
    useShowEmbedModal();
  const hasAutoSelected = useRef(
    sessionStorage.getItem('chat_has_auto_selected') === 'true'
  );

  const handleDialogCardClick = useCallback(
    (dialogId: string) => () => {
      handleClickDialog(dialogId);
    },
    [handleClickDialog],
  );

  useEffect(() => {
    if (!hasAutoSelected.current && dialogList.length > 0) {
      if (!dialogId) {
        handleDialogCardClick(dialogList[0].id)();
        hasAutoSelected.current = true;
        sessionStorage.setItem('chat_has_auto_selected', 'true');
      }
    }
  }, [dialogList]);

  // 首次进入页面自动选中第一个助理（无dialogId时），dialogId变化后自动新建一个聊天并只执行一次
  useEffect(() => {
    if (!dialogLoading && dialogList.length > 0 && !dialogId) {
      handleDialogCardClick(dialogList[0].id)();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogLoading, dialogList, dialogId]);

  useEffect(() => {
    if (!dialogLoading && dialogId && !hasAutoSelected.current) {
      addTemporaryConversation();
      hasAutoSelected.current = true;
      sessionStorage.setItem('chat_has_auto_selected', 'true');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogLoading, dialogId]);

  // 助理下没有聊天记录时自动新建聊天
  useEffect(() => {
    if (dialogList.length > 0 && dialogId) {
      // 当前助理下没有聊天记录
      if (conversationList.length === 0) {
        addTemporaryConversation();
      }
    }
  }, [dialogList, dialogId, conversationList, addTemporaryConversation]);

  const handleAppCardEnter = (id: string) => () => {
    handleItemEnter(id);
  };

  const handleConversationCardEnter = (id: string) => () => {
    handleConversationItemEnter(id);
  };

  const handleShowChatConfigurationModal =
    (dialogId?: string): any =>
      (info: any) => {
        info?.domEvent?.preventDefault();
        info?.domEvent?.stopPropagation();
        showDialogEditModal(dialogId);
      };

  const { refetch: refetchDialogList } = useFetchNextDialogList();
  const handleRemoveDialog =
    (dialogId: string): MenuItemProps['onClick'] =>
      async ({ domEvent }) => {
        domEvent.preventDefault();
        domEvent.stopPropagation();
        await onRemoveDialog([dialogId]);
        // 删除后强制刷新并走自动选中逻辑
        refetchDialogList();
      };

  const handleShowOverviewModal =
    (dialog: IDialog): any =>
      (info: any) => {
        info?.domEvent?.preventDefault();
        info?.domEvent?.stopPropagation();
        setRecord(dialog);
        showEmbedModal();
      };

  const handleRemoveConversation =
    (conversationId: string): MenuItemProps['onClick'] =>
      ({ domEvent }) => {
        domEvent.preventDefault();
        domEvent.stopPropagation();
        onRemoveConversation([conversationId]);
      };

  const handleShowConversationRenameModal =
    (conversationId: string): MenuItemProps['onClick'] =>
      ({ domEvent }) => {
        domEvent.preventDefault();
        domEvent.stopPropagation();
        showConversationRenameModal(conversationId);
      };

  const handleConversationCardClick = useCallback(
    (conversationId: string, isNew: boolean) => () => {
      handleClickConversation(conversationId, isNew ? 'true' : '');
      setController((pre) => {
        pre.abort();
        return new AbortController();
      });
    },
    [handleClickConversation],
  );

  const handleCreateTemporaryConversation = useCallback(() => {
    if (!(dialogList.length > 0)) {
      message.warning('请先创建一个助理');
      return;
    }
    addTemporaryConversation();
  }, [addTemporaryConversation, dialogList]);

  useEffect(() => {
    // 只在没有选中会话 或 当前会话已被删除时自动跳转
    const exist = conversationList.some(item => item.id === conversationId);
    if (conversationList.length > 0 && (!conversationId || !exist)) {
      handleConversationCardClick(conversationList[0].id, conversationList[0].is_new)();
    }
  }, [conversationList, conversationId, handleConversationCardClick]);

  const buildAppItems = (dialog: IDialog) => {
    const dialogId = dialog.id;

    const appItems: MenuProps['items'] = [
      {
        key: '1',
        onClick: handleShowChatConfigurationModal(dialogId),
        label: (
          <Space>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" width="14" height="14" viewBox="0 0 14 14">
              <defs>
                <clipPath id="master_svg0_76_05869">
                  <rect x="0" y="0" width="14" height="14" rx="0" />
                </clipPath>
              </defs>
              <g clipPath="url(#master_svg0_76_05869)">
                <g>
                  <path d="M2.3493075,13.033775L11.6837875,13.033775C12.4321875,13.033775,13.0408875,12.424975,13.0408875,11.676675L13.0408875,5.706945C13.0408875,5.411825,12.8017875,5.172645,12.5066875,5.172645C12.2117875,5.172645,11.9723875,5.411825,11.9723875,5.706945L11.9723875,11.675975C11.9723875,11.835075,11.8428875,11.964575,11.6837875,11.964575L2.3493075,11.964575C2.1902775,11.964575,2.0607875,11.835075,2.0607875,11.675975L2.0607875,2.341495C2.0607875,2.182465,2.1902775,2.052975,2.3489875,2.052975L7.8104675,2.053285C8.1055875,2.053285,8.3447675,1.81411,8.3447675,1.518988C8.3447675,1.223867,8.1055875,0.984689293,7.8104675,0.984689293L2.3489875,0.984375C1.6009735,0.984375,0.9921875,1.593161,0.9921875,2.341805L0.9921875,11.676275C0.9921875,12.424975,1.6009735,13.033775,2.3493075,13.033775ZM6.1775175,7.742065C6.2818575,7.846405,6.4185775,7.898585,6.5552975,7.898585C6.6970275,7.898755,6.8329875,7.842425,6.9330775,7.742065L12.7493875,1.925751C12.9580875,1.717375,12.9580875,1.378881,12.7493875,1.17019C12.5406875,0.9614992,12.2024875,0.9614992,11.9937875,1.17019L6.1775175,6.986505C5.9688275,7.194875,5.9688275,7.533375,6.1775175,7.742065Z" fillRule="evenodd" fill="#2C2C2C" fillOpacity="1" style={{ mixBlendMode: "normal" }} />
                </g>
              </g>
            </svg>
            {t('edit', { keyPrefix: 'common' })}
          </Space>
        ),
      },
      { type: 'divider' },
      {
        key: '2',
        onClick: handleShowOverviewModal(dialog),
        label: (
          <Space>
            {/* <KeyOutlined /> */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" width="14" height="14" viewBox="0 0 14 14">
              <defs>
                <clipPath id="master_svg0_76_05855">
                  <rect x="0" y="0" width="14" height="14" rx="0" />
                </clipPath>
              </defs>
              <g clipPath="url(#master_svg0_76_05855)">
                <g>
                  <path d="M1.8125,1.98046875C1.225697,1.98046875,0.75,2.45616575,0.75,3.04296875L0.75,11.54296875C0.75,12.12976875,1.225698,12.60546875,1.8125,12.60546875L12.1875,12.60546875C12.7743,12.60546875,13.25,12.12976875,13.25,11.54296875L13.25,3.04296875C13.25,2.45616575,12.7743,1.98046875,12.1875,1.98046875L1.8125,1.98046875ZM12.1875,3.04296875L12.1875,4.63622875L1.8125,4.63622875L1.8125,3.04296875L12.1875,3.04296875ZM1.8125,5.57372875L12.1875,5.57372875L12.1875,11.54296875L1.8125,11.54296875L1.8125,5.57372875ZM7.76556,6.78950875C7.83369,6.53957875,7.68617,6.28178875,7.43619,6.21387875C7.18627,6.14575875,6.92847,6.29326875,6.86056,6.54325875L5.92306,9.98075875C5.85492,10.23071875,6.00238,10.48857875,6.25238,10.55659875C6.50237,10.62462875,6.76016,10.47703875,6.82806,10.22700875L7.76556,6.78950875ZM9.16932,9.147628749999999C8.98653,9.33063875,8.98653,9.627118750000001,9.16932,9.81012875C9.35233,9.99291875,9.6488,9.99291875,9.83182,9.81012875L11.0818,8.56012875C11.2646,8.377118750000001,11.2646,8.08063875,11.0818,7.89762875L9.83182,6.64762875C9.65091,6.45347875,9.34505,6.44807875,9.15741,6.63572875C8.96976,6.82336875,8.97516,7.12922875,9.16932,7.31012875L10.08807,8.22887875L9.16932,9.147628749999999ZM4.83181,7.31012875C5.0146,7.12711875,5.0146,6.83063875,4.83181,6.64762875C4.6488,6.46484875,4.35233,6.46484875,4.169309999999999,6.64762875L2.91931,7.89762875C2.73653,8.08063875,2.73653,8.377118750000001,2.91931,8.56012875L4.169309999999999,9.81012875C4.35022,10.00427875,4.65607,10.00967875,4.84372,9.82203875C5.03136,9.63438875,5.02597,9.32853875,4.83181,9.147628749999999L3.91306,8.22887875L4.83181,7.31012875Z" fillRule="evenodd" fill="#2C2C2C" fillOpacity="1" style={{ mixBlendMode: "normal" }} />
                </g>
              </g>
            </svg>
            {t('embedIntoSite', { keyPrefix: 'common' })}
          </Space>
        ),
      },
      {
        key: '3',
        onClick: handleRemoveDialog(dialogId),
        label: (
          <Space style={{ color: '#F56C6C' }}>
            <DeleteOutlined />
            {t('delete', { keyPrefix: 'common' })}
          </Space>
        ),
      },
      { type: 'divider' },

    ];

    return appItems;
  };

  const buildConversationItems = (conversationId: string) => {
    const appItems: MenuProps['items'] = [
      {
        key: '1',
        onClick: handleShowConversationRenameModal(conversationId),
        label: (
          <Space>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" width="14" height="14" viewBox="0 0 14 14">
              <defs>
                <clipPath id="master_svg0_76_05869">
                  <rect x="0" y="0" width="14" height="14" rx="0" />
                </clipPath>
              </defs>
              <g clipPath="url(#master_svg0_76_05869)">
                <g>
                  <path d="M2.3493075,13.033775L11.6837875,13.033775C12.4321875,13.033775,13.0408875,12.424975,13.0408875,11.676675L13.0408875,5.706945C13.0408875,5.411825,12.8017875,5.172645,12.5066875,5.172645C12.2117875,5.172645,11.9723875,5.411825,11.9723875,5.706945L11.9723875,11.675975C11.9723875,11.835075,11.8428875,11.964575,11.6837875,11.964575L2.3493075,11.964575C2.1902775,11.964575,2.0607875,11.835075,2.0607875,11.675975L2.0607875,2.341495C2.0607875,2.182465,2.1902775,2.052975,2.3489875,2.052975L7.8104675,2.053285C8.1055875,2.053285,8.3447675,1.81411,8.3447675,1.518988C8.3447675,1.223867,8.1055875,0.984689293,7.8104675,0.984689293L2.3489875,0.984375C1.6009735,0.984375,0.9921875,1.593161,0.9921875,2.341805L0.9921875,11.676275C0.9921875,12.424975,1.6009735,13.033775,2.3493075,13.033775ZM6.1775175,7.742065C6.2818575,7.846405,6.4185775,7.898585,6.5552975,7.898585C6.6970275,7.898755,6.8329875,7.842425,6.9330775,7.742065L12.7493875,1.925751C12.9580875,1.717375,12.9580875,1.378881,12.7493875,1.17019C12.5406875,0.9614992,12.2024875,0.9614992,11.9937875,1.17019L6.1775175,6.986505C5.9688275,7.194875,5.9688275,7.533375,6.1775175,7.742065Z" fillRule="evenodd" fill="#2C2C2C" fillOpacity="1" style={{ mixBlendMode: "normal" }} />
                </g>
              </g>
            </svg>
            {t('rename', { keyPrefix: 'common' })}
          </Space>
        ),
      },
      { type: 'divider' },
      {
        key: '2',
        onClick: handleRemoveConversation(conversationId),
        label: (
          <Space style={{ color: '#F56C6C' }}>
            <DeleteOutlined />
            {t('delete', { keyPrefix: 'common' })}
          </Space>
        ),
      },
    ];

    return appItems;
  };

  return (
    <Flex className={styles.chatWrapper}>
      <Flex className={styles.chatAppWrapper}>
        <Flex flex={1} vertical className={styles.chatAppLeft}>
          <Button type="primary" style={{
            borderRadius: '60px',
            background: 'linear-gradient(80deg, #55C9FF 0%, #306EFD 100%)',
            width: '216px',
            height: 40,
            fontSize: 16,
            lineHeight: 20,
            marginBottom: 20,
            border: 'none',
            position: 'relative',
          }}
            onClick={handleShowChatConfigurationModal()}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" width="20" height="20" viewBox="0 0 20 20">
              <defs>
                <clipPath id="master_svg0_76_03204">
                  <rect x="0" y="0" width="20" height="20" rx="0" />
                </clipPath>
              </defs>
              <g clipPath="url(#master_svg0_76_03204)">
                <g>
                  <path d="M16.875,8.75L10,8.75L10,1.875C10,1.525,9.725,1.25,9.375,1.25C9.025,1.25,8.75,1.525,8.75,1.875L8.75,8.75L1.875,8.75C1.525,8.75,1.25,9.025,1.25,9.375C1.25,9.725,1.525,10,1.875,10L8.75,10L8.75,16.875C8.75,17.225,9.025,17.5,9.375,17.5C9.725,17.5,10,17.225,10,16.875L10,10L16.875,10C17.225,10,17.5,9.725,17.5,9.375C17.5,9.025,17.225,8.75,16.875,8.75Z" fill="#FFFFFF" fillOpacity="1" style={{ mixBlendMode: "normal" }} />
                </g>
              </g>
            </svg>
            {t('createAssistant')}
            <Robot style={{ position: 'absolute', right: 8 }} />
          </Button>
          <Flex className={styles.chatAppContent} vertical gap={10}>
            <Spin spinning={dialogLoading} wrapperClassName={styles.chatSpin}>
              {dialogList.map((x) => (
                <Card
                  key={x.id}
                  hoverable
                  className={classNames(styles.chatAppCard, {
                    [theme === 'dark'
                      ? styles.chatAppCardSelectedDark
                      : styles.chatAppCardSelected]: dialogId === x.id,
                  })}
                  onMouseEnter={handleAppCardEnter(x.id)}
                  onMouseLeave={handleItemLeave}
                  onClick={conversationLoading ? undefined : handleDialogCardClick(x.id)}
                  style={{
                    pointerEvents: conversationLoading ? 'none' : 'auto',
                    opacity: conversationLoading ? 0.5 : 1,
                    cursor: conversationLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Flex justify="space-between" align="center">
                    <Space size={15}>
                      {/* <Avatar src={x.icon} shape={'square'} /> */}
                      <section>
                        <b>
                          <Text
                            ellipsis={{ tooltip: x.name }}
                            style={{ width: 130 }}
                          >
                            {x.name}
                          </Text>
                        </b>
                        <div>{x.description}</div>
                      </section>
                    </Space>
                    {activated === x.id && (
                      <section>
                        <Dropdown menu={{ items: buildAppItems(x) }}>
                          <ChatAppCube
                            className={styles.cubeIcon}
                          ></ChatAppCube>
                        </Dropdown>
                      </section>
                    )}
                  </Flex>
                </Card>
              ))}
            </Spin>
          </Flex>
        </Flex>
        <Divider className={styles.divider}></Divider>
        <Flex className={styles.chatTitleWrapper}>
          <Flex flex={1} vertical>
            {/* <Flex
              justify={'space-between'}
              align="center"
              className={styles.chatTitle}
            >
              <Space>
                <b>{t('chat')}</b>
                <Tag>{conversationList.length}</Tag>
              </Space>
              <Tooltip title={t('newChat')}>
                <div>
                  <SvgIcon
                    name="plus-circle-fill"
                    width={20}
                    onClick={handleCreateTemporaryConversation}
                  ></SvgIcon>
                </div>
              </Tooltip>
            </Flex> */}
            <Button type="primary" className={styles.newChatBtn}
              onClick={handleCreateTemporaryConversation}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" width="20" height="20" viewBox="0 0 20 20">
                <defs>
                  <clipPath id="master_svg0_76_03204">
                    <rect x="0" y="0" width="20" height="20" rx="0" />
                  </clipPath>
                </defs>
                <g clipPath="url(#master_svg0_76_03204)">
                  <g>
                    <path d="M16.875,8.75L10,8.75L10,1.875C10,1.525,9.725,1.25,9.375,1.25C9.025,1.25,8.75,1.525,8.75,1.875L8.75,8.75L1.875,8.75C1.525,8.75,1.25,9.025,1.25,9.375C1.25,9.725,1.525,10,1.875,10L8.75,10L8.75,16.875C8.75,17.225,9.025,17.5,9.375,17.5C9.725,17.5,10,17.225,10,16.875L10,10L16.875,10C17.225,10,17.5,9.725,17.5,9.375C17.5,9.025,17.225,8.75,16.875,8.75Z" fill="#FFFFFF" fillOpacity="1" style={{ mixBlendMode: "normal" }} />
                  </g>
                </g>
              </svg>
              新增聊天
            </Button>
            <Flex vertical gap={10} className={styles.chatTitleContent}>
              <Spin
                spinning={conversationLoading}
                wrapperClassName={styles.chatSpin}
              >
                {conversationList.map((x) => (
                  <Card
                    key={x.id}
                    hoverable
                    onClick={handleConversationCardClick(x.id, x.is_new)}
                    onMouseEnter={handleConversationCardEnter(x.id)}
                    onMouseLeave={handleConversationItemLeave}
                    className={classNames(styles.chatTitleCard, {
                      [theme === 'dark'
                        ? styles.chatTitleCardSelectedDark
                        : styles.chatTitleCardSelected]: x.id === conversationId,
                    })}
                  >
                    <Flex justify="space-between" align="center">
                      <div>
                        <Text
                          ellipsis={{ tooltip: x.name }}
                          style={{ width: 150 }}
                        >
                          {x.name}
                        </Text>
                      </div>
                      {conversationActivated === x.id &&
                        x.id !== '' &&
                        !x.is_new && (
                          <section>
                            <Dropdown
                              menu={{ items: buildConversationItems(x.id) }}
                            >
                              <ChatAppCube
                                className={styles.cubeIcon}
                              ></ChatAppCube>
                            </Dropdown>
                          </section>
                        )}
                    </Flex>
                  </Card>
                ))}
              </Spin>
            </Flex>
          </Flex>
        </Flex>
      </Flex>


      <ChatContainer controller={controller}></ChatContainer>
      {dialogEditVisible && (
        <ChatConfigurationModal
          visible={dialogEditVisible}
          initialDialog={initialDialog}
          showModal={showDialogEditModal}
          hideModal={hideDialogEditModal}
          loading={dialogSettingLoading}
          onOk={onDialogEditOk}
          clearDialog={clearDialog}
        ></ChatConfigurationModal>
      )}
      <RenameModal
        visible={conversationRenameVisible}
        hideModal={hideConversationRenameModal}
        onOk={onConversationRenameOk}
        initialName={initialConversationName}
        loading={conversationRenameLoading}
      ></RenameModal>

      {embedVisible && (
        <EmbedModal
          visible={embedVisible}
          hideModal={hideEmbedModal}
          token={currentRecord.id}
          form={SharedFrom.Chat}
          beta={beta}
          isAgent={false}
        ></EmbedModal>
      )}
    </Flex>
  );
};

export default Chat;

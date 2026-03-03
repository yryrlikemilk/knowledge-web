import moshengtouxiang from '@/assets/newImages/医生头像.png';
import { useFetchUserInfo } from '@/hooks/user-setting-hooks';
import { Avatar } from 'antd';
import React from 'react';
import { history } from 'umi';
import styles from '../../index.less';
const App: React.FC = () => {
  const { data: userInfo } = useFetchUserInfo();

  const toSetting = () => {
    history.push('/user-setting');
  };

  return (
    <div
      onClick={toSetting}
      style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
    >
      <Avatar
        size={40}
        className={styles.clickAvailable}
        // icon={<UserOutlined />}
        src={moshengtouxiang}
      />
      <span className={styles.rightName}>
        {userInfo.nickname ||
          (() => {
            try {
              const localUser = localStorage.getItem('userInfo');
              if (localUser) {
                const parsed = JSON.parse(localUser);
                return parsed.name || '';
              }
            } catch {
              return '';
            }
            return '';
          })()}
      </span>
    </div>
  );
};

export default App;

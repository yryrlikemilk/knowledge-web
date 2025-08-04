import SvgIcon from '@/components/svg-icon';
import { useAuth } from '@/hooks/auth-hooks';
import {
  useLogin,
  useLoginChannels,
  useLoginWithChannel,
  useRegister,
} from '@/hooks/login-hooks';
import { useSystemConfig } from '@/hooks/system-hooks';
import { rsaPsw } from '@/utils';
import { Button, Checkbox, Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'umi';
import RightPanel from './right-panel';

import styles from './index.less';

const Login = () => {
  const [title, setTitle] = useState('login');
  const navigate = useNavigate();
  const { login, loading: signLoading } = useLogin();
  const { register, loading: registerLoading } = useRegister();
  const { channels, loading: channelsLoading } = useLoginChannels();
  const { login: loginWithChannel, loading: loginWithChannelLoading } =
    useLoginWithChannel();
  const loading =
    signLoading ||
    registerLoading ||
    channelsLoading ||
    loginWithChannelLoading;
  const { config } = useSystemConfig();
  const registerEnabled = config?.registerEnabled !== 0;

  const { isLogin } = useAuth();
  useEffect(() => {
    if (isLogin) {
      navigate('/chat');
    }
  }, [isLogin, navigate]);

  const handleLoginWithChannel = async (channel: string) => {
    await loginWithChannel(channel);
  };

  const changeTitle = () => {
    if (title === 'login' && !registerEnabled) {
      return;
    }
    setTitle((title) => (title === 'login' ? 'register' : 'login'));
  };
  const [form] = Form.useForm();

  useEffect(() => {
    form.validateFields(['nickname']);
  }, [form]);

  const onCheck = async () => {
    try {
      const params = await form.validateFields();

      const rsaPassWord = rsaPsw(params.password) as string;

      if (title === 'login') {
        const code = await login({
          email: `${params.email}`.trim(),
          password: rsaPassWord,
        });
        if (code === 0) {
          navigate('/chat');
        }
      } else {
        const code = await register({
          nickname: params.nickname,
          email: params.email,
          password: rsaPassWord,
        });
        if (code === 0) {
          setTitle('login');
        }
      }
    } catch (errorInfo) {
      console.log('Failed:', errorInfo);
    }
  };
  const formItemLayout = {
    labelCol: { span: 6 },
    // wrapperCol: { span: 8 },
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginLeft}>
        <div className='pt-12 pl-10'>
          <img style={{ width: '338px', height: 42 }}
            src={require('@/assets/imgs/loginTop.png')} alt="loginTop" />
        </div>
        <div className={styles.leftContainerMain}>
          <div className={styles.leftContainer}>
            <div className={styles.loginTitle}>
              <div className={styles.loginLeftTitle}>{title === 'login' ? '登录' : '注册'}</div>
              <span className={styles.loginLeftDesc}>
                {title === 'login' ? '很高兴再次见到您！' : '很高兴您加入！'}
              </span>
            </div>

            <Form
              form={form}
              layout="vertical"
              name="dynamic_rule"
              style={{ maxWidth: 600 }}
              autoComplete="off"
            >
              <Form.Item
                {...formItemLayout}
                name="email"
                label="邮箱"
                rules={[{ required: true, message: '请输入邮箱地址' }]}
              >
                <Input autoComplete="new-email" size="large" placeholder="请输入邮箱地址" />
              </Form.Item>
              {title === 'register' && (
                <Form.Item
                  {...formItemLayout}
                  name="nickname"
                  label="名称"
                  rules={[{ required: true, message: '请输入名称' }]}
                >
                  <Input autoComplete="off" size="large" placeholder="请输入名称" />
                </Form.Item>
              )}
              <Form.Item
                {...formItemLayout}
                name="password"
                label="密码"
                style={{marginBottom:10}}
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  size="large"
                  placeholder="请输入密码"
                  autoComplete="new-password"
                  onPressEnter={onCheck}
                />
              </Form.Item>
              {title === 'login' && (
                <Form.Item name="remember"  style={{marginBottom:0}}   valuePropName="checked">
                  <Checkbox> 记住我</Checkbox>
                </Form.Item>
              )}

              <Button
                type="primary"
                block
                size="large"
                onClick={onCheck}
                loading={loading}
                style={{marginTop:40}}
              >
                {title === 'login' ? '登录' : '继续'}
              </Button>
              <div className='text-center'>
                {title === 'login' && registerEnabled && (
                  <div style={{color:' #666B70'}}>
                    没有帐户？
                    <Button type="link" onClick={changeTitle}>
                      注册
                    </Button>
                  </div>
                )}
                {title === 'register' && (
                  <div>
                    已经有帐户？
                    <Button type="link" onClick={changeTitle}>
                      登录
                    </Button>
                  </div>
                )}
              </div>
              {title === 'login' && channels && channels.length > 0 && (
                <div className={styles.thirdPartyLoginButton}>
                  {channels.map((item) => (
                    <Button
                      key={item.channel}
                      block
                      size="large"
                      onClick={() => handleLoginWithChannel(item.channel)}
                      style={{ marginTop: 10 }}
                    >
                      <div className="flex items-center">
                        <SvgIcon
                          name={item.icon || 'sso'}
                          width={20}
                          height={20}
                          style={{ marginRight: 5 }}
                        />
                        使用 {item.display_name} 登录
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </Form>
          </div>
        </div>

      </div>
      <div className={styles.loginRight}>
        <RightPanel></RightPanel>
      </div>
    </div>
  );
};

export default Login;

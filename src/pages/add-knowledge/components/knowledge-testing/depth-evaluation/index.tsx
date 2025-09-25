import React, { useState } from 'react';
import { Space, Button } from 'antd';
import styles from './index.less';
import AutoEvaluation from './auto-evaluation';
import TestQuestions from './test-questions';

const DeepSearch = () => {
    const [activeTab, setActiveTab] = useState<'auto' | 'questions'>('auto');

    return (
        <div className={styles.deepSearchWrapper}>
            <div  style={{ width: '100%' ,height:'100%',flexDirection:'column',display:'flex'}}>
                <div style={{
                    display: 'flex', justifyContent: 'start',
                }}>
                    <Button
                        type={activeTab === 'auto' ? 'primary' : 'default'}
                        // icon={<Search size={16} />}
                        onClick={() => setActiveTab('auto')}
                        style={{borderRadius:4}}
                        size="middle"
                    >
                        自动评估
                    </Button>
                    <Button
                    style={{borderRadius:4}}
                        type={activeTab === 'questions' ? 'primary' : 'default'}
                        // icon={<ListIcon size={16} />}
                        onClick={() => setActiveTab('questions')}
                        size="middle"
                    >
                        测试问题
                    </Button>
                </div>

                <div style={{ flex: 1 }}>
                    {activeTab === 'auto' ? (
                        <AutoEvaluation onSwitchToQuestions={() => setActiveTab('questions')} />
                    ) : (
                        <TestQuestions />
                    )}
                </div>

            </div>
        </div>
    );
};

export default DeepSearch;

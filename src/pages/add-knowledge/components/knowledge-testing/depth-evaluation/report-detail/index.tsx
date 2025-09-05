import React, { useState } from 'react';
import { Button } from 'antd';
import ReactECharts from 'echarts-for-react';

const ReportDetail: React.FC = () => {
  // const params = useParams();
  // const location = useLocation();
  // const reportId = params.id as string;
  // const knowledgeId = new URLSearchParams(location.search).get('id') || '';

  // 筛选状态
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 静态数据
  const questionData = [
    {
      id: 1,
      title: 'CAD如何安装',
      source: 'manual',
      category: 'CAD软件问题',
      searchResults: 5,
      documents: 2
    },
    {
      id: 2,
      title: '如何配置打印机',
      source: 'manual',
      category: '打印机配置',
      searchResults: 3,
      documents: 1
    },
    {
      id: 3,
      title: 'Office软件使用技巧',
      source: 'ai',
      category: '办公软件问题',
      searchResults: 8,
      documents: 3
    },
    {
      id: 4,
      title: '网络连接问题排查',
      source: 'manual',
      category: '网络与设备连接',
      searchResults: 6,
      documents: 2
    },
    {
      id: 5,
      title: '其他工具使用指南',
      source: 'ai',
      category: '其他工具问题',
      searchResults: 4,
      documents: 1
    }
  ];

  // 筛选数据
  const filteredData = questionData.filter(item => {
    const sourceMatch = selectedSource === 'all' || item.source === selectedSource;
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
    return sourceMatch && categoryMatch;
  });

  // 计算每个分类的数量
  const getCategoryCount = (category: string) => {
    if (category === 'all') {
      return questionData.length;
    }
    return questionData.filter(item => item.category === category).length;
  };

  // 计算每个来源的数量
  const getSourceCount = (source: string) => {
    if (source === 'all') {
      return questionData.length;
    }
    return questionData.filter(item => item.source === source).length;
  };

  // 仪表盘配置
  const gaugeOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        radius: '100px',
        center: ['50%', '100%'],
        axisLine: {
          lineStyle: {
            width: 16,
            color: [
              [0.93, '#52c41a'], // 绿色进度条
              [1, '#f0f0f0']     // 灰色背景
            ]
          }
        },
        pointer: {
          show: false
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: false
        },
        axisLabel: {
          show: false
        },
        title: {
          show: false
        },
        detail: {
          fontSize: 20,
          offsetCenter: [0, '-8%'],
          valueAnimation: true,
          formatter: function (value: number) {
            return Math.round(value);
          },
        },
        data: [
          {
            value: 93
          }
        ]
      }
    ]
  };

  return (
    <div >
      <div style={{ padding: 16, borderBottom: '1px solid #eee' }} >
        <span>评估报告概览</span>
        <span>（评估分数：<span style={{ color: "#52c41a" }}>
          优
        </span> 90-100 <span style={{ color: "#f9b83c",marginLeft: '6px' }}>
            良</span>70-90
             <span style={{ color: "#fd5d5f",marginLeft: '6px' }}>
            差</span>
            0-70）</span>
      </div>
      <div style={{ padding: 16 }} >
        <div className='flex'>
          <div className=' p-2 ' style={{ width: "30%" }} >
            <div className='text-left w-full'>评估分数</div>

            <div style={{ width: '200px', height: '100px', margin: '0 auto' }}>
              <ReactECharts option={gaugeOption} style={{ width: '100%', height: '100%' }} />
            </div>
            <div style={{
              textAlign: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#52c41a',
              marginTop: '6px'
            }}>
              优
            </div>
          </div>
          <div className=' p-2 ' style={{ width: "70%" }}>
            <div className='w-full text-left'>单项情况</div>
            <div className='flex justify-center gap-4'>
              <div className='p-4 ' style={{
                width: "40%",
                backgroundColor: '#eaeaea',
              }}>
                <div style={{ fontSize: 30, fontWeight: 600, color: '#63a103' }}>78%</div>
                <div>问题可回答率</div>
              </div>
              <div className='p-4' style={{
                width: "40%",
                borderRadius: '8px', backgroundColor: '#eaeaea'
              }}>
                <div style={{ fontSize: 30, fontWeight: 600 }}>100%</div>
                <div>问题覆盖率</div>

              </div>
            </div>
          </div>
        </div>

        <div>
          <div className='my-2'>问题可回答率较低，建议继续补充知识库内容，点击查看无检索结果的问题</div>
          <Button type='primary'  >去上传相关文件</Button>
        </div>
      </div>
      <div style={{ padding: 16, display: 'flex', justifyContent: "space-between", borderBottom: '1px solid #eee' }} >
        <span>测试问题分类</span>
        <div className='flex gap-2'>
          <span>下载</span>
          <span>无检查结果</span>
        </div>

      </div>
      <div style={{ padding: 16 }} >
        <div>
          {/* 来源筛选 */}
          <div style={{ marginBottom: '16px' }}>
            <span
              style={{
                padding: '8px 16px',
                marginRight: '16px',
                cursor: 'pointer',
                borderBottom: selectedSource === 'all' ? '2px solid #1890ff' : '2px solid transparent',
                color: selectedSource === 'all' ? '#1890ff' : '#666'
              }}
              onClick={() => setSelectedSource('all')}
            >
              所有问题({getSourceCount('all')})
            </span>
            <span
              style={{
                padding: '8px 16px',
                marginRight: '16px',
                cursor: 'pointer',
                borderBottom: selectedSource === 'ai' ? '2px solid #1890ff' : '2px solid transparent',
                color: selectedSource === 'ai' ? '#1890ff' : '#666'
              }}
              onClick={() => setSelectedSource('ai')}
            >
              AI生成({getSourceCount('ai')})
            </span>
            <span
              style={{
                padding: '8px 16px',
                marginRight: '16px',
                cursor: 'pointer',
                borderBottom: selectedSource === 'manual' ? '2px solid #1890ff' : '2px solid transparent',
                color: selectedSource === 'manual' ? '#1890ff' : '#666'
              }}
              onClick={() => setSelectedSource('manual')}
            >
              手工输入({getSourceCount('manual')})
            </span>
          </div>
          {/* 分类筛选 */}
          <div style={{
            marginBottom: '16px',
            width: '100%',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            paddingBottom: '8px'
          }}>
            <div style={{
              display: 'inline-flex',
              minWidth: 'max-content',
            }}>
              <span
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderBottom: selectedCategory === 'all' ? '2px solid #1890ff' : '2px solid transparent',
                  color: selectedCategory === 'all' ? '#1890ff' : '#666',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setSelectedCategory('all')}
              >
                全部({getCategoryCount('all')})
              </span>
              <span
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderBottom: selectedCategory === 'CAD软件问题' ? '2px solid #1890ff' : '2px solid transparent',
                  color: selectedCategory === 'CAD软件问题' ? '#1890ff' : '#666',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setSelectedCategory('CAD软件问题')}
              >
                CAD软件问题({getCategoryCount('CAD软件问题')})
              </span>
              <span
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderBottom: selectedCategory === '办公软件问题' ? '2px solid #1890ff' : '2px solid transparent',
                  color: selectedCategory === '办公软件问题' ? '#1890ff' : '#666',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setSelectedCategory('办公软件问题')}
              >
                办公软件问题({getCategoryCount('办公软件问题')})
              </span>
              <span
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderBottom: selectedCategory === '网络与设备连接' ? '2px solid #1890ff' : '2px solid transparent',
                  color: selectedCategory === '网络与设备连接' ? '#1890ff' : '#666',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setSelectedCategory('网络与设备连接')}
              >
                网络与设备连接({getCategoryCount('网络与设备连接')})
              </span>
              <span
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderBottom: selectedCategory === '打印机配置' ? '2px solid #1890ff' : '2px solid transparent',
                  color: selectedCategory === '打印机配置' ? '#1890ff' : '#666',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setSelectedCategory('打印机配置')}
              >
                打印机配置({getCategoryCount('打印机配置')})
              </span>
              <span
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderBottom: selectedCategory === '其他工具问题' ? '2px solid #1890ff' : '2px solid transparent',
                  color: selectedCategory === '其他工具问题' ? '#1890ff' : '#666',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setSelectedCategory('其他工具问题')}
              >
                其他工具问题({getCategoryCount('其他工具问题')})
              </span>
            </div>
          </div>
        </div>
        {/* 问题列表 */}
        {filteredData.map((item) => (
          <div key={item.id} style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }} >
            <div className='flex justify-between items-center'>
              <div >
                <div style={{ fontSize: '16px', fontWeight: '500' }}>{item.title}</div>
                <div style={{ marginTop: 8, color: '#666' }}>
                  <span style={{ marginRight: '16px' }}>检索结果数：{item.searchResults}</span>
                  <span>文档数：{item.documents}</span>
                </div>
              </div>
              <div>
                <Button type='primary'>查看检索结果</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* <div >任务 ID: {reportId}</div>
      {knowledgeId && (
        <div >知识库 ID: {knowledgeId}</div>
      )} */}
    </div>
  );
};

export default ReportDetail;

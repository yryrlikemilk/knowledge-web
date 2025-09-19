import React, { useState, useMemo } from 'react';
import { Button, Pagination, Dropdown, Menu } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useParams } from 'umi';
import { useFetchRetrievalTaskReport, useFetchRetrievalTaskQuestionList } from '@/hooks/knowledge-hooks';

interface QuestionItem {
  id: string;
  auto_generate: boolean;
  category_sub: string;
  create_time: string;
  max_score: number;
  original_question_id: string;
  question_text: string;
  retrieval_count: number;
  task_id: string;
  update_time: string;
}

interface CategoryItem {
  category: string;
  count: number;
}

const ReportDetail: React.FC = () => {
  const params = useParams();
  const reportId = params.id as string;

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // 筛选状态
  const [selectedSource, setSelectedSource] = useState<'all' | 'ai' | 'manual'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedResult, setSelectedResult] = useState<number>(0); // 默认选中第一个选项
  const [resultOpen, setResultOpen] = useState<boolean>(false); // 新增：下拉打开状态

  // 获取报告数据
  const { reportData, loading: reportLoading } = useFetchRetrievalTaskReport(reportId, currentPage, pageSize);
  
  // 获取问题列表数据
  const { questionListData, loading: questionListLoading } = useFetchRetrievalTaskQuestionList(
    reportId,
    currentPage,
    pageSize,
    selectedSource === 'all' ? undefined : selectedSource === 'ai',
    selectedCategory === 'all' ? undefined : selectedCategory,
    selectedResult
  );

  // 从API数据获取问题列表
  const questionData = questionListData.page_result.records || [];
  const statistics = questionListData.statistics || {
    ai_generate_category: [],
    ai_generate_count: 0,
    manual_input_count: 0,
    total_question_count: 0
  };

  // 缓存下拉选项
  const resultOptions = useMemo(() => [
    { value: 0, label: '全部' },
    { value: 1, label: '无检索结果' },
    { value: 2, label: '检索结果分数不足80分' }
  ], []);

  // 计算每个分类的数量
  const getCategoryCount = (category: string) => {
    if (category === 'all') {
      return statistics.total_question_count;
    }
    const categoryData = statistics.ai_generate_category.find((item: CategoryItem) => item.category === category);
    return categoryData ? categoryData.count : 0;
  };

  // 计算每个来源的数量
  const getSourceCount = (source: string) => {
    if (source === 'all') {
      return statistics.total_question_count;
    }
    if (source === 'ai') {
      return statistics.ai_generate_count;
    }
    if (source === 'manual') {
      return statistics.manual_input_count;
    }
    return 0;
  };

  // 处理筛选变化，重置分页
  const handleSourceChange = (source: 'all' | 'ai' | 'manual') => {
    setSelectedSource(source);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleResultChange = (value: number) => {
    setSelectedResult(value);
    setCurrentPage(1); // 重置分页到第一页
  };

  // 获取评分等级和颜色
  const getScoreLevel = (score: number) => {
    if (score >= 90) return { level: '优', color: '#52c41a' };
    if (score >= 70) return { level: '良', color: '#f9b83c' };
    return { level: '差', color: '#fd5d5f' };
  };

  const handleDownload = () => {
    console.log(`下载`)
  };

  const scoreLevel = getScoreLevel(reportData.score);

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
              [reportData.score / 100, scoreLevel.color], // 动态颜色
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
            value: reportData.score
          }
        ]
      }
    ]
  };

  // 缓存分类选项
  const categoryOptions = useMemo(() => {
    return [
      { key: "all", value: "all", label: `全部(${getCategoryCount('all')})` },
      ...statistics.ai_generate_category.map((categoryItem: CategoryItem) => ({
        key: categoryItem.category,
        value: categoryItem.category,
        label: `${categoryItem.category}(${categoryItem.count})`
      }))
    ];
  }, [statistics.ai_generate_category]);

  // 缓存来源选项
  const sourceOptions = useMemo(() => [
    <span
      key="all"
      style={{
        padding: '8px 16px',
        marginRight: '16px',
        cursor: 'pointer',
        borderBottom: selectedSource === 'all' ? '2px solid #1890ff' : '2px solid transparent',
        color: selectedSource === 'all' ? '#1890ff' : '#666'
      }}
      onClick={() => handleSourceChange('all')}
    >
      所有问题({getSourceCount('all')})
    </span>,
    <span
      key="ai"
      style={{
        padding: '8px 16px',
        marginRight: '16px',
        cursor: 'pointer',
        borderBottom: selectedSource === 'ai' ? '2px solid #1890ff' : '2px solid transparent',
        color: selectedSource === 'ai' ? '#1890ff' : '#666'
      }}
      onClick={() => handleSourceChange('ai')}
    >
      AI生成({getSourceCount('ai')})
    </span>,
    <span
      key="manual"
      style={{
        padding: '8px 16px',
        marginRight: '16px',
        cursor: 'pointer',
        borderBottom: selectedSource === 'manual' ? '2px solid #1890ff' : '2px solid transparent',
        color: selectedSource === 'manual' ? '#1890ff' : '#666'
      }}
      onClick={() => handleSourceChange('manual')}
    >
      手工输入({getSourceCount('manual')})
    </span>
  ], [selectedSource]);

  // 检索结果下拉菜单
  const resultMenu = (
    <Menu
      onClick={({ key }) => {
        handleResultChange(Number(key));
        // 点击菜单项后会自动触发 onVisibleChange 为 false，但这里可以确保关闭状态
        setResultOpen(false);
      }}
      selectedKeys={[selectedResult.toString()]}
    >
      {resultOptions.map(option => (
        <Menu.Item key={option.value}>
          {option.label}
        </Menu.Item>
      ))}
    </Menu>
  );

  // 分类下拉菜单
  // const categoryMenu = (
  //   <Menu
  //     onClick={({ key }) => handleCategoryChange(key)}
  //     selectedKeys={[selectedCategory]}
  //   >
  //     {categoryOptions.map(option => (
  //       <Menu.Item key={option.value}>
  //         {option.label}
  //       </Menu.Item>
  //     ))}
  //   </Menu>
  // );

  if (reportLoading || questionListLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
        <span>评估报告概览</span>
        <span>（评估分数：<span style={{ color: scoreLevel.color }}>
          {scoreLevel.level}
        </span> 90-100 <span style={{ color: "#f9b83c", marginLeft: '6px' }}>
          良</span>70-90
           <span style={{ color: "#fd5d5f", marginLeft: '6px' }}>
          差</span>
          0-70）</span>
      </div>
      <div style={{ padding: 16 }}>
        <div className='flex'>
          <div className=' p-2 ' style={{ width: "30%" }}>
            <div className='text-left w-full'>评估分数</div>

            <div style={{ width: '200px', height: '100px', margin: '0 auto' }}>
              <ReactECharts option={gaugeOption} style={{ width: '100%', height: '100%' }} />
            </div>
            <div style={{
              textAlign: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              color: scoreLevel.color,
              marginTop: '6px'
            }}>
              {scoreLevel.level}
            </div>
          </div>
          <div className=' p-2 ' style={{ width: "70%" }}>
            <div className='w-full text-left'>单项情况</div>
            <div className='flex justify-center gap-4'>
              <div className='p-4 ' style={{
                width: "40%",
                backgroundColor: '#eaeaea',
              }}>
                <div style={{ fontSize: 30, fontWeight: 600, color: '#63a103' }}>
                  {Math.round(reportData.answerable_rate * 100)}%
                </div>
                <div>问题可回答率</div>
              </div>
              <div className='p-4' style={{
                width: "40%",
                borderRadius: '8px', backgroundColor: '#eaeaea'
              }}>
                <div style={{ fontSize: 30, fontWeight: 600 }}>
                  {Math.round(reportData.accuracy_rate * 100)}%
                </div>
                <div>问题覆盖率</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className='my-2'>
            {reportData.answerable_rate < 0.8 
              ? '问题可回答率较低，建议继续补充知识库内容，点击查看无检索结果的问题'
              : '知识库内容较为完善，问题可回答率良好'
            }
          </div>
          <Button type='primary'>去上传相关文件</Button>
        </div>
      </div>
      <div style={{ padding: 16, display: 'flex', justifyContent: "space-between", borderBottom: '1px solid #eee' }}>
        <span>测试问题分类</span>
        <div className='flex gap-2'>
          <Button type='link' onClick={() => { handleDownload() }}>下载</Button>
          <Dropdown
            overlay={resultMenu}
            trigger={['click']}
            onVisibleChange={(visible) => setResultOpen(visible)}
            visible={resultOpen} // antd v4 使用 visible，v5 使用 open；若项目使用 v5 改为 open={resultOpen}
          >
            <Button type='link'>
              {resultOptions.find(option => option.value === selectedResult)?.label || '全部'}
              {/* 根据下拉打开状态切换图标 */}
              {resultOpen ? <UpOutlined style={{ marginLeft: 8 }} /> : <DownOutlined style={{ marginLeft: 8 }} />}
            </Button>
          </Dropdown>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div>
          {/* 来源筛选 */}
          <div style={{ marginBottom: '16px' }}>
            {sourceOptions}
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
              {categoryOptions.map(option => (
                <span
                  key={option.value}
                  onClick={() => handleCategoryChange(option.value)}
                  style={{
                    padding: '8px 12px',
                    marginRight: '12px',
                    cursor: 'pointer',
                    borderBottom: selectedCategory === option.value ? '2px solid #1890ff' : '2px solid transparent',
                    color: selectedCategory === option.value ? '#1890ff' : '#666',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                  }}
                >
                  {option.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* 问题列表 */}
        {questionData.map((item: QuestionItem) => (
          <div key={item.id} style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
            <div className='flex justify-between items-center'>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '500' }}>{item.question_text}</div>
                <div style={{ marginTop: 8, color: '#666' }}>
                  <span style={{ marginRight: '16px' }}>检索结果数：{item.retrieval_count}</span>
                  <span style={{ marginRight: '16px' }}>最高分：{item.max_score}</span>
                  <span style={{ marginRight: '16px' }}>来源：{item.auto_generate ? 'AI生成' : '手工输入'}</span>
                  {item.category_sub && <span>分类：{item.category_sub}</span>}
                </div>
              </div>
              <div>
                <Button type='primary'>查看检索结果</Button>
              </div>
            </div>
          </div>
        ))}
        
        {/* 分页组件 */}
        <div style={{ padding: '16px 0', textAlign: 'right' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={questionListData.page_result.total}
            showSizeChanger
            align="end"
            showQuickJumper
            showTotal={(total, range) => `共 ${total} 条`}
            onChange={(page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            }}
            onShowSizeChange={(current, size) => {
              setCurrentPage(1);
              setPageSize(size);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;
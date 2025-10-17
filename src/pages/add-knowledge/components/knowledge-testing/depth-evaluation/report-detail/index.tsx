import React, { useState, useMemo, useCallback } from 'react';
import { Button, Pagination, Dropdown, message, Tooltip } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useLocation, useNavigate } from 'umi';
import request from '@/utils/request';
import { useFetchRetrievalTaskReport, useFetchRetrievalTaskQuestionList, useExportQuestionCategory } from '@/hooks/knowledge-hooks';
// import request from '@/utils/request';
import RetrievalResultModal from './retrieval-result-modal';
import styles from './index.less'; // 新增：引入样式模块
import cha from '@/assets/imgs/cha.png';
import you from '@/assets/imgs/you.png';
import liang from '@/assets/imgs/liang.png';
import reportDetailTopBg from '@/assets/imgs/report-detail-top-bg.png';
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
  doc_count?: number;
}

interface CategoryItem {
  category: string;
  count: number;
}

const ReportDetail: React.FC = () => {

  // 从查询参数读取 reportId 和 知识库 id（id）
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const reportId = (query.get('reportId') || query.get('report_id') || '') as string;
  const knowledgeId = (query.get('id') || query.get('kb_id') || '') as string;

  const navigate = useNavigate(); // 新增：用于页面跳转

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选状态
  const [selectedSource, setSelectedSource] = useState<'all' | 'ai' | 'manual'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedResult, setSelectedResult] = useState<number>(0); // 默认选中第一个选项
  const [resultOpen, setResultOpen] = useState<boolean>(false); // 新增：下拉打开状态

  // 检索结果弹窗状态
  const [retrievalModalVisible, setRetrievalModalVisible] = useState(false);
  const [itemQuestion, setItemQuestion] = useState<any>(null)
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
  const statistics = useMemo(() => questionListData.statistics || {
    ai_generate_category: [],
    ai_generate_count: 0,
    manual_input_count: 0,
    total_question_count: 0
  }, [questionListData.statistics]);

  // 缓存下拉选项
  const resultOptions = useMemo(() => [
    { value: 0, label: '全部' },
    { value: 1, label: '无检索结果' },
    { value: 2, label: '检索结果分数不足80分' }
  ], []);

  // 计算每个分类的数量
  const getCategoryCount = useCallback((category: string) => {
    if (category === 'all') {
      return statistics.category_count;
    }
    const categoryData = statistics.ai_generate_category.find((item: CategoryItem) => item.category === category);
    return categoryData ? categoryData.count : 0;
  }, [statistics]);

  // 计算每个来源的数量
  const getSourceCount = useCallback((source: string) => {
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
  }, [statistics]);

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

  const { exportQuestionCategory } = useExportQuestionCategory();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
       await exportQuestionCategory(reportId);
      // if (res?.code === 0) {
      //   message.success('下载成功');
      // } else {
      //   message.error('下载失败');
      // }
    } catch (e) {
      message.error('下载失败');
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadFiles = () => {
    navigate(`/knowledge/dataset?id=${knowledgeId}`);
  };

  const handleCreateAssistant = async () => {
    // 组装创建助手参数并调用接口
    // llm_id 优先取可用的第一个（若无法获取则回退到默认值）
    let llmId = 'DeepSeek-R1___OpenAI-API@OpenAI-API-Compatible';
    // 如后续需要可在此处补充获取可用 llm 列表的逻辑，并设置 llmId = list[0].id

    const payload = {
      name: `快速助理-${Date.now()}`,
      icon: '',
      llm_id: llmId,
      llm_setting: {
        temperature: 0.1,
        top_p: 0.3,
        presence_penalty: 0.4,
        frequency_penalty: 0.7,
      },
      prompt_config: {
        system: `你是一个智能助手，请总结知识库的内容来回答问题，请列举知识库中的数据详细回答。当所有知识库内容都与问题无关时，你的回答必须包括“知识库中未找到您要的答案！”这句话。回答需要考虑聊天历史。
        以下是知识库：
        {knowledge}
        以上是知识库。`,
        refine_multiturn: false,
        use_kg: false,
        reasoning: false,
        parameters: [],
        empty_response: '',
      },
      similarity_threshold: 0.2,
      vector_similarity_weight: 0.7,
      top_n: 8,
    };

    try {
      const { data } = await request.post('/v1/dialog/set', { data: payload });
      console.log(`resprespresp`, data)
      if (data && data.code === 0) {
        message.success('助手创建成功');
        navigate(`/chat`);
      } else {
        message.error('助手创建失败');
      }
    } catch (err) {
      console.error(err);
      message.error('创建助手失败，请重试');
    }
  };

  // 获取评价提示
  const getEvaluationPrompt = () => {
    const answerableRate = (reportData?.answerable_rate || 0) * 100; // 转换为百分比
    const accuracyRate = (reportData?.accuracy_rate || 0) * 100; // 转换为百分比
    const N = reportData?.question_count || 0; // 当前问题数

    // 可回答率 < 100%
    if (answerableRate < 100) {
      return {
        type: 'error',
        message: '可回答率低',
        description: '建议继续补充知识库内容，点击查看无检索结果的问题',
      };
    }

    // 可回答率 = 100 且 回答准确率 < 85%
    if (answerableRate >= 100 && accuracyRate < 85) {
      return {
        type: 'warning',
        message: '问题可回答率高，但部分问题的答案准确率低',
        description: '建议优化参数或者补充相关文档试试，点击查看回答准确率较低的问题',
      };
    }

    // 可回答率 = 100 且 回答准确率 >= 85 且 N >= 推荐问题数
    if (answerableRate >= 100 && accuracyRate >= 85 && N >= reportData?.recommend_count) {
      return {
        type: 'success',
        message: '问题可回答率高',
        description: `且大部分问题的回答准确率较高，建议可直接创建助手进行问答体验`,
      };
    }

    // 可回答率 = 100 且 回答准确率 >= 85 且 N < 推荐问题数
    if (answerableRate >= 100 && accuracyRate >= 85 && N < reportData?.recommend_count) {
      return {
        type: 'info',
        message: '问题可回答率高',
        description: `，且大部分问题的回答准确率较高，但问题较少，建议添加问题继续测试。`,
      };
    }

    // 默认情况
    return {
      type: 'info',
      message: '评估中...',
      description: '正在分析知识库质量',
    };
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
    const aiCategories: CategoryItem[] = Array.isArray(statistics.ai_generate_category)
      ? statistics.ai_generate_category
      : [];
    return [
      { key: "all", value: "all", label: `全部(${getCategoryCount('all') || 0})` },
      ...aiCategories.map((categoryItem: CategoryItem) => ({
        key: categoryItem.category,
        value: categoryItem.category,
        label: `${categoryItem.category}(${categoryItem.count})`
      }))
    ];
  }, [statistics, getCategoryCount]);

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
      手动输入({getSourceCount('manual')})
    </span>
  ], [selectedSource, getSourceCount]);

  // 检索结果下拉菜单（antd v5：使用 menu 配置而非 overlay/Menu 组件）
  const resultMenuItems = resultOptions.map(option => ({
    key: option.value.toString(),
    label: option.label,
  }));

  const resultMenu = {
    items: resultMenuItems,
    selectable: true,
    selectedKeys: [selectedResult.toString()],
    onClick: ({ key }: { key: string }) => {
      handleResultChange(Number(key));
      setResultOpen(false);
    },
  };

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

  // 打开弹窗（由弹窗内部拉取检索结果）
  const handleViewRetrieval = async (item: QuestionItem) => {
    setItemQuestion(item)
    setRetrievalModalVisible(true);
  };

  if (reportLoading || questionListLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div>
          <i style={{ height: '100%', borderLeft: "4px solid #0C7CFF", borderRadius: '4px' }}></i>
          <span className='pl-2 text-[16px] font-bold '>评估报告概览</span>
        </div>
        <div className='pl-2  flex'>
          <span className='flex'>（评估分数：<img style={{ height: 22 }} src={you} alt="优" /> 90-100 <img style={{ height: 22 }} src={liang} alt="良" /> 70-90
            <img src={cha} style={{ height: 22 }} alt="差" />
            0-70）</span>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div className='flex'>
          <div className=' p-2 ' style={{ width: "25%" }}>
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


          <div className=' p-2 ' style={{ width: "75%" }}>
            <div className='w-full text-left'>单项情况</div>
            <div className='flex justify-center gap-4'>
              <div className='p-4 ' style={{
                width: "40%",
                backgroundImage: `url(${reportDetailTopBg})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>
                <div style={{ fontSize: 30, fontWeight: 600, color: '#63a103' }}>
                  {Math.round(reportData.answerable_rate * 100)}%
                </div>
                <div>问题可回答率</div>
              </div>
              <div className='p-4' style={{
                width: "40%",
                backgroundImage: `url(${reportDetailTopBg})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>
                <div style={{ fontSize: 30, fontWeight: 600 }}>
                  {Math.round(reportData.accuracy_rate * 100)}%
                </div>
                <div>回答准确率</div>
              </div>

              <Tooltip
                title={`根据知识库文件个数、大小建议需 ${reportData?.recommend_count} 个问题进行测试。`}
              >
                <div className='p-4' style={{
                  width: "40%",
                  backgroundImage: `url(${reportDetailTopBg})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}>
                  <div style={{ fontSize: 30, fontWeight: 600 }}>
                    {reportData.question_count}
                  </div>



                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span>问题总数</span>

                  </div>
                </div>
              </Tooltip>

            </div>
          </div>
        </div>

        <div>
          {(() => {
            const evaluation = getEvaluationPrompt();
            const getPromptStyle = (type: string) => {
              switch (type) {
                case 'error':
                  return {
                    color: '#666666',
                    backgroundColor: '#fff2f0',
                    border: '1px solid #ffccc7',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '12px'
                  };
                case 'warning':
                  return {
                    color: '#666666',
                    backgroundColor: '#fff7e6',
                    border: '1px solid #ffd591',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '12px'
                  };
                case 'success':
                  return {
                    color: '#666666',
                    backgroundColor: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '12px'
                  };
                case 'info':
                default:
                  return {
                    color: '#666666',
                    backgroundColor: '#e6f7ff',
                    border: '1px solid #91d5ff',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '12px'
                  };
              }
            };

            return (
              <div style={getPromptStyle(evaluation.type)}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {evaluation.type === 'error' ? (
                    <div>
                      <span>
                        可回答率低，建议继续补充知识库内容，
                      </span>
                      <Button type='link' style={{ padding: 0 }}
                        onClick={() => handleResultChange(1)}
                      >
                        点击查看无检索结果的问题
                      </Button>
                    </div>

                  ) : evaluation.type === 'warning' ? (
                    <div>
                      <span>
                        问题可回答率高，但部分问题的答案准确率低,建议优化参数或者补充相关文档试试，
                      </span>
                      <Button type='link'
                        style={{ color: '#1677ff', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => handleResultChange(2)}
                      >
                        点击查看回答准确率较低的问题
                      </Button>
                    </div>

                  ) : (
                    evaluation.description
                  )}
                </div>

              </div>
            );
          })()}
          {/* 根据评估类型及交互展示不同按钮 */}
          {(() => {
            const evaluation = getEvaluationPrompt();
            if (evaluation.type === 'error') {
              return (
                <div style={{ marginTop: 12 }}>
                  <Button type="primary" onClick={handleUploadFiles}>
                    去上传相关文件
                  </Button>
                </div>
              );
            }
            if (evaluation.type === 'success') {
              return (
                <div style={{ marginTop: 12 }}>
                  <Button type="primary" onClick={handleCreateAssistant}>
                    一键创建助手
                  </Button>
                </div>
              );
            }
            // 其他情况不显示按钮
            return null;
          })()}
        </div>
      </div>
      <div style={{ padding: 16, display: 'flex', justifyContent: "space-between", borderBottom: '1px solid #eee' }}>
        <div>
          <i style={{ height: '100%', borderLeft: "4px solid #0C7CFF", borderRadius: '4px' }}></i>
          <span className='pl-2 text-[16px] font-bold'>测试问题分类</span>
        </div>

        <div className='flex gap-2'>
          <Button type='link' loading={downloading} onClick={handleDownload}>下载</Button>
          <Dropdown
            menu={resultMenu}
            trigger={['click']}
            onOpenChange={(open) => setResultOpen(open)}
            open={resultOpen}
            className={styles.customDropdown} // 新增：应用自定义样式，设置每项高度为20px
          >
            <Button type='link' style={{ lineHeight: 20 }}>
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
                  <span style={{ marginRight: '16px' }}>文档数：{item.doc_count}</span>
                  <span style={{ marginRight: '16px' }}>来源：{item.auto_generate ? 'AI生成' : '手动输入'}</span>
                  {item.category_sub && <span>分类：{item.category_sub}</span>}
                </div>
              </div>
              <div>
                <Button type='primary' onClick={() => handleViewRetrieval(item)}>查看检索结果</Button>
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
            showTotal={(total) => `共 ${total} 条`}
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

        {/* 检索结果弹窗 */}
        <RetrievalResultModal
          visible={retrievalModalVisible}
          onCancel={() => setRetrievalModalVisible(false)}
          itemQuestion={itemQuestion}
        />
      </div>
    </div>
  );
};

export default ReportDetail;
import {
  Typography,
  Form,
  Input,
  Button,
  Slider,
  Space,
  message,
  Result
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';
import ScatterChart from './scatter-chat';
import sampleDataList from "./data.json"
import ClusterVisualization from './cluster-visualization';
import { useClusteringAnalysisStream } from '@/hooks/tools-hooks';
import MarkdownTable from "@/components/markdown-table";
import { clusteringAnalysisCalculate } from '@/services/tools-service';
const { Text } = Typography;
const { TextArea } = Input;

interface ScatterData {
  x: number;
  y: number;
  color: string;
}

const testdatadata = [
  {
    "clusteringNum": 0,
    "textContent": "场景一：AI+清单自动化 智能清单生成引擎 自动输出设备名称/单位/数量三维结构，关联历史清单数据库 供应商智能推荐系统 历史合作供应商（信用评级）、行业标杆（TOP10）、可替代供应商（参数相似度≥90%） 多维清单分析平台 变更追踪标红技术 | 参数对比雷达图（性能/价格/交付周期） | 智能配置建议引擎 合规性审核中枢 排他性条款AI检测模型| 智能格式校验器（标点/单位/编号）| 一键合规优化 数据驱动采购决策 实时业务洞察 | 精准匹配供需 | 全链路可追溯 | 动态优化配置",
    "x": -3.42,
    "y": -25.37
  },
  {
    "clusteringNum": 2,
    "textContent": "场景二：AI+造价估算 动态价格优化中枢 历史报价沉淀库 风险预警决策系统 智能成本分解引擎 积累过往报价数据，为价格预测提供基础依据，挖掘价格波动规律。 价格异动实时追踪 参数化建模 大宗商品期货指数 预警准确率高 供应商履约画像 构建动态成本公式库，精准计算各环节成本，适应复杂项目需求。 依据期货指数，分析原材料价格走向，助力精准采购决策。 实时监测价格波动，提前规避风险。 精准评估供应商履约能力，保障供应链稳定。 数据智能驱动 替代方案模拟 实时价格穿透力 成本结构可解释性 推演多套可行性方案，为成本优化提供多种选择，降低风险。 核心能力架构 决策敏捷度升级 风险收益动态平衡",
    "x": 24.7,
    "y": 9.86
  },
  {
    "clusteringNum": 1,
    "textContent": "场景三：AI+供应商管理 工商注册、税务申报、司法记录等企业基础数据 1 多源异构数据整合 招标文件、投标文件、合同文本等业务数据 2 供应商历史合作记录、交付质量等业务行为数据 3 语义相似度模型​​：检测投标文件重复率、异常条款表述 1 规则引擎​​：硬性指标筛查（如经营范围不匹配、资质过期） 2 风险识别与预警​AI模型引擎​​： 空壳公司识别：注册资本虚高检测+经营异常预测模型 围标识别：投标行为聚类分析+关联图谱穿透检测 3 围标案件拦截实时阻断 风险处置人工耗时降低 实时拦截​​：高风险投标自动冻结并触发人工复核 1​​策略优化​​：基于历史误报率动态调整模型阈值 动态防控体系​2 供应商分级​​：建立五维信用评分体系（财务/质量/交付/合规/合作）",
    "x": -21.28,
    "y": 15.52
  }
]

export const sampleData: ScatterData[] = [
  { x: 0.5, y: 1.0, color: "#ff7f0e" },
  { x: 1.0, y: 1.5, color: "#1f77b4" },
  { x: 1.5, y: 2.0, color: "#2ca02c" },
  { x: 2.0, y: 2.5, color: "#d62728" },
  { x: 2.5, y: 3.0, color: "#9467bd" },
  { x: 3.0, y: 3.5, color: "#8c564b" },
  { x: 0.8, y: 3.2, color: "#e377c2" },
  { x: 1.2, y: 2.8, color: "#7f7f7f" },
  { x: 2.3, y: 1.7, color: "#bcbd22" },
  { x: 1.7, y: 1.2, color: "#17becf" }
];
const sampleData2 = sampleDataList


const generateData = () => {
  const clusters = [
    { x: 3, y: 3, count: 10, id: 0 },
    { x: 8, y: 8, count: 10, id: 1 },
    { x: 15, y: 15, count: 10, id: 2 }
  ];

  return clusters.flatMap(cluster =>
    Array.from({ length: cluster.count }, (_, idx) => ({
      x: +(cluster.x + (Math.random() * 2 - 1)).toFixed(2),
      y: +(cluster.y + (Math.random() * 2 - 1)).toFixed(2),
      cluster: cluster.id,
      label: `点${cluster.id + 1}-${idx + 1}`,
      value: (Math.random() * 100).toFixed(2)
    }))
  );
};
const ClusteringAnalysis = () => {
  const [form] = Form.useForm();
  const [analysisResult, setAnalysisResult] = useState('');
  const [textSegments, setTextSegments] = useState([0, 1]); // 默认两个文本段
  const [clusterData, setClusterData] = useState([]);
  const { runClustering, isLoading: isProcessing } = useClusteringAnalysisStream();

  // 添加文本段
  const handleAddTextSegment = () => {
    setTextSegments(prev => [...prev, prev.length]);
  };

  // 删除文本段
  const handleDeleteTextSegment = (index: number) => {
    if (textSegments.length <= 2) {
      message.warning('至少需要保留两个文本段！');
      return;
    }
    setTextSegments(prev => prev.filter((_, i) => i !== index));
  };

  // 聚类分析处理
  const handleClusterAnalysis = async () => {
    const formData = form.getFieldsValue();

    if (!formData.threshold || !formData.textSegments || formData.textSegments.length < 2) {
      message.error('请填写所有必填项！');
      return;
    }

    const emptySegments = formData.textSegments.filter((text: string) => !text || text.trim() === '');
    if (emptySegments.length > 0) {
      message.error('请填写所有文本段！');
      return;
    }

    setAnalysisResult('');
    setClusterData([]);
    try {
      // 并发请求流式分析和聚类点计算
      await Promise.all([
        runClustering({
          clusteringText: formData.textSegments,
          thresholdValue: formData.threshold,
          onMessage: (chunk) => {
            console.log('onMessage', new Date().toLocaleString());
            try {
              const data = JSON.parse(chunk);
              // if (data.choices !== undefined) {
              //   const reasoningContent = data.choices[0]?.delta?.reasoning_content ?? data.choices[0]?.delta?.content ?? '';
              if (data.content !== undefined) {
                const reasoningContent = data.content ;
                setAnalysisResult(prev => prev + reasoningContent);
              }
            } catch {
              setAnalysisResult(prev => prev + chunk);
            }
          }
        }),
        (async () => {
          const clusterDataRes = await clusteringAnalysisCalculate(formData.textSegments, formData.threshold);
          setClusterData(clusterDataRes);
        })()
      ]);
      message.success('聚类分析完成！');
    } catch (err) {
      message.error('聚类分析失败！');
    }
  };

  console.log(`clusterData`, clusterData);
  return (
    <div >
      <div style={{ width: "100%", backgroundColor: '#fff', borderRadius: '4px', padding: '20px' }}>

        <Form form={form} layout="vertical" >
          <Form.Item
            label="阈值"
            name="threshold"
            initialValue={0.3}
            layout="horizontal"
            rules={[{ required: true, message: '请设置阈值！' }]}
          >
            {/* <div style={{ padding: '0 16px' }}> */}

            <Slider max={1} step={0.1} min={0} />
            {/* </div> */}
          </Form.Item>

          <Form.Item
            label="文本段"
            required
            style={{ marginBottom: '16px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {textSegments.map((_, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Form.Item
                    name={['textSegments', index]}
                    rules={[{ required: true, message: '输入或粘贴您想要聚类的文本' }]}
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <TextArea
                      placeholder={`输入或粘贴您想要聚类的文本...`}
                      style={{
                        height: '100px',
                        resize: 'none',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}
                    />
                  </Form.Item>
                  {textSegments.length > 2 && (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteTextSegment(index)}
                      style={{ marginTop: '8px' }}
                    />
                  )}
                </div>
              ))}

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddTextSegment}
                style={{ width: '100%' }}
              >
                添加文本段
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Button
            type="primary"
            size="large"
            onClick={handleClusterAnalysis}
            loading={isProcessing}
            style={{ minWidth: '120px' }}
          >
            {isProcessing ? '分析中...' : '聚类分析'}
          </Button>
        </div>


        <div style={{ marginBottom: '16px' }}>
          <Text strong style={{ fontSize: '16px' }}>分析结果</Text>
        </div>
        <div style={{ width: '100%' }}>

          <TextArea
            value={analysisResult}
            placeholder="分析结果将在这里显示..."
            style={{
              width: '100%',
              minHeight: '300px',
              resize: 'none',
              fontSize: '14px',
              lineHeight: '1.6',
              border: 'none',
              background: 'transparent'
            }}
            readOnly
          />
          {/* <ScatterChart2  data={sampleData} /> */}
          {/* 修复类型错误，确保传递给ScatterChart的数据格式正确 */}
          {/* <ScatterChart scatterData={sampleData2 as { value: [number, number]; itemStyle?: { color: string } }[]} /> */}
          {analysisResult ? (<ClusterVisualization data={clusterData} />) : (<div />)}




          {/* <ScatterChart scatterData={sampleData2 as [number, number][]} /> */}
        </div>
      </div>
    </div>
  );
};

export default ClusteringAnalysis; 
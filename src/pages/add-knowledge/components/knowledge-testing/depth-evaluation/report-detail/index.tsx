import React from 'react';
import { Typography } from 'antd';
import { useParams, useLocation } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const ReportDetail: React.FC = () => {
  const params = useParams();
  const location = useLocation();
  const reportId = params.id as string;
  const knowledgeId = new URLSearchParams(location.search).get('id') || '';

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>报告详情</Title>
      <Paragraph type="secondary">任务 ID: {reportId}</Paragraph>
      {knowledgeId && (
        <Paragraph type="secondary">知识库 ID: {knowledgeId}</Paragraph>
      )}
      <div style={{ marginTop: 24, color: '#999' }}>这里是报告详情占位页面，后续补充具体内容。</div>
    </div>
  );
};

export default ReportDetail;

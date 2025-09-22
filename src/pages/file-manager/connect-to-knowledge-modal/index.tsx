import { useTranslate } from '@/hooks/common-hooks';
import { useFetchKnowledgeList } from '@/hooks/knowledge-hooks';
import { IModalProps } from '@/interfaces/common';
import { filterOptionsByInput } from '@/utils/common-util';
import { Form, Modal, Select, Checkbox } from 'antd';
import { useEffect, useState } from 'react';

const ConnectToKnowledgeModal = ({
  visible,
  hideModal,
  onOk,
  initialValue,
  loading,
}: IModalProps<string[]> & { initialValue: string[] }) => {
  const [form] = Form.useForm();
  const { list } = useFetchKnowledgeList();
  const { t } = useTranslate('fileManager');

  const options = list?.map((item) => ({
    label: item.name,
    value: item.id,
  }));

  const handleOk = async () => {
    const values = await form.getFieldsValue();
    const knowledgeIds = values.knowledgeIds ?? [];
    return onOk?.(knowledgeIds);
  };

  useEffect(() => {
    if (visible) {
      form.setFieldValue('knowledgeIds', initialValue);
    }
  }, [visible, initialValue, form]);

  const [selectedIds, setSelectedIds] = useState<string[]>(initialValue || []);

  useEffect(() => {
    // keep local selectedIds in sync when modal opens / initial changes
    if (visible) {
      setSelectedIds(initialValue || []);
    }
  }, [visible, initialValue]);

  const handleSelectChange = (values: string[]) => {
    setSelectedIds(values);
    form.setFieldValue('knowledgeIds', values);
  };

  return (
    <Modal
      title={t('addToKnowledge')}
      open={visible}
      onOk={handleOk}
      onCancel={hideModal}
      confirmLoading={loading}
    >
      <Form form={form}>
        <Form.Item name="knowledgeIds" noStyle>
          <Select
            mode="multiple"
            allowClear
            showSearch
            style={{ width: '100%' }}
            placeholder={t('pleaseSelect')}
            value={selectedIds}
            onChange={handleSelectChange}
            optionLabelProp="label"            // 使用 label 作为选中显示文本，避免把 children（含 Checkbox）渲染到上方
            optionFilterProp="label"           // 搜索也按 label 过滤
            filterOption={filterOptionsByInput}
          >
            {list?.map((item) => (
              <Select.Option key={item.id} value={item.id} label={item.name}>
                <div style={{ display: 'flex',  alignItems: 'center',gap:8 }}>
                  <span
                    // 阻止 Checkbox 的鼠标事件触发 Select 的选中/关闭默认行为
                    onMouseDown={(e:any) => e.preventDefault()}
                  >
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        const exists = selectedIds.includes(item.id);
                        const next = exists ? selectedIds.filter(id => id !== item.id) : [...selectedIds, item.id];
                        setSelectedIds(next);
                        form.setFieldValue('knowledgeIds', next);
                      }}
                    />
                  </span>
                  <span style={{ paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>

                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ConnectToKnowledgeModal;

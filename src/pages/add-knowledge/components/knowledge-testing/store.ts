import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface TestingQuestionItem {
  query: string;
  total: number;
  documents: any[];
  chunks: any[];
  // 保存其他相关字段
  [key: string]: any;
}

export type TestingState = {
  // 保存的问题列表
  savedQuestionList: TestingQuestionItem[];
  // 当前选中的问题索引
  currentQuestionIndex: number;
  // 是否已经初始化过
  hasInitialized: boolean;
  // 弹窗是否可见（用于重置状态）
  modalVisible: boolean;
  
  // Actions
  initializeQuestionList: (questions: TestingQuestionItem[]) => void;
  updateQuestionStats: (questions: TestingQuestionItem[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setModalVisible: (visible: boolean) => void;
  resetState: () => void;
};

// 创建测试结果的 Zustand store
const useTestingStore = create<TestingState>()(
  devtools(
    immer((set, get) => ({
      // 初始状态
      savedQuestionList: [],
      currentQuestionIndex: 0,
      hasInitialized: false,
      modalVisible: false,

      // 初始化问题列表（只在第一次调用）
      initializeQuestionList: (questions: TestingQuestionItem[]) => {
        const { hasInitialized } = get();
        if (!hasInitialized && questions.length > 0) {
          set({
            savedQuestionList: questions,
            hasInitialized: true,
          });
          console.log('Store - 初始化问题列表:', questions);
        }
      },

      // 更新问题列表的统计数据（结果数和文档数）
      updateQuestionStats: (questions: TestingQuestionItem[]) => {
        const { hasInitialized, savedQuestionList } = get();
        if (hasInitialized && questions.length > 0) {
          const updatedList = savedQuestionList.map((savedItem, index) => {
            const newItem = questions[index];
            if (newItem) {
              return {
                ...savedItem, // 保持原有内容
                total: newItem.total || 0, // 更新结果数
                documents: newItem.documents || [], // 更新文档数
              };
            }
            return savedItem;
          });
          set({
            savedQuestionList: updatedList,
          });
          console.log('Store - 更新问题列表统计数据:', updatedList);
        }
      },

      // 设置当前选中的问题索引
      setCurrentQuestionIndex: (index: number) => {
        set({
          currentQuestionIndex: index,
        });
      },

      // 设置弹窗可见性
      setModalVisible: (visible: boolean) => {
        set({
          modalVisible: visible,
        });
        // 弹窗关闭时重置状态
        if (!visible) {
          get().resetState();
        }
      },

      // 重置所有状态
      resetState: () => {
        set({
          savedQuestionList: [],
          currentQuestionIndex: 0,
          hasInitialized: false,
        });
        console.log('Store - 重置所有状态');
      },
    })),
    { name: 'testing' },
  ),
);

export default useTestingStore;


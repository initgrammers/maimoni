export type ScanCategoryInput = {
  name: string;
  type: 'income' | 'expense';
};

export type ScanResultItem = {
  name: string;
  price: number;
};

export type ScanResult = {
  total_amount: number;
  date: string;
  merchant_name: string;
  category: string;
  type: 'income' | 'expense';
  note: string;
  items: ScanResultItem[];
};

export type ScanAiClient = {
  extractReceiptInfo(
    input: Buffer,
    fileName: string,
    categories: ScanCategoryInput[],
  ): Promise<ScanResult>;
};

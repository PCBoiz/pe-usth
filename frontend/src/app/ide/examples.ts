/** Đoạn mã nạp nhanh vào editor để thử các giới hạn của sandbox. */
export type IdeExample = { id: string; label: string; code: string };

export const IDE_EXAMPLES: IdeExample[] = [
  { id: 'hello', label: 'print(1+1)', code: 'print(1+1)\n' },
  { id: 'loop', label: 'Vòng lặp vô hạn (hết giờ)', code: 'while True:\n    pass\n' },
  { id: 'ram', label: 'Ăn RAM (vượt 1 GB)', code: 'x = b"x" * (2 * 1024**3)\n' },
  { id: 'flood', label: 'In vô hạn (cắt đầu ra)', code: 'while True:\n    print("x")\n' },
  { id: 'input', label: 'input() (chưa hỗ trợ stdin)', code: 'input()\n' },
  {
    id: 'pool',
    label: 'multiprocessing.Pool(4)',
    code: [
      'import multiprocessing',
      '',
      '',
      'def square(n):',
      '    return n * n',
      '',
      '',
      'if __name__ == "__main__":',
      '    with multiprocessing.Pool(4) as pool:',
      '        print(pool.map(square, range(8)))',
      '',
    ].join('\n'),
  },
];

export const DEFAULT_CODE = 'print("Xin chào, Programming EDU!")\n';

export interface MinigameSlot {
  n: number;
  label: string;
  name: string;
  placeholder: string;
  answer: string;
}

export interface MinigameOption {
  id: string;
  label: string;
  slot: number;
  trap?: string;
}

export interface MinigameScaffoldData {
  title: string;
  eyebrow: string;
  filename: string;
  langTag: string;
  stepCurrent: number;
  stepTotal: number;
  streak: string;
  xp: string;
  templateLines: string[];
  slots: Record<number, MinigameSlot>;
  bank: MinigameOption[];
  successExplanations: {
    slotNumber: number;
    code: string;
    explanation: string;
  }[];
}

export const P01_MINIGAME_DATA: MinigameScaffoldData = {
  title: 'Lắp chỗ so sánh khi đếm, chỗ dùng bảng cha và bước đi lên cây.',
  eyebrow: 'Kéo mã vào chỗ trống',
  filename: 'main.py',
  langTag: 'Python 3.12',
  stepCurrent: 7,
  stepTotal: 14,
  streak: '5/7 ngày',
  xp: '1.240 XP',
  templateLines: [
    'def count_processes(table, program):',
    '    count = 0',
    '    for pid, ppid, name in table:',
    '        if {{slot1}}:',
    '            count += 1',
    '    return count',
    '',
    '',
    'def ancestors(table, pid):',
    '    parent_of = {}',
    '    for row_pid, row_ppid, program in table:',
    '        {{slot2}}',
    '    if pid not in parent_of:',
    '        raise ValueError(f"không có process {pid} trong bảng")',
    '    chain = [pid]',
    '    while parent_of[pid] != 0:',
    '        pid = {{slot3}}',
    '        chain.append(pid)',
    '    return chain',
  ],
  slots: {
    1: {
      n: 1,
      name: 'Thả điều kiện',
      label: 'So sánh tên chương trình',
      placeholder: 'Thả điều kiện',
      answer: 'name == program',
    },
    2: {
      n: 2,
      name: 'Thả phép gán',
      label: 'Tạo bảng cha',
      placeholder: 'Thả phép gán',
      answer: 'parent_of[row_pid] = row_ppid',
    },
    3: {
      n: 3,
      name: 'Thả bước đi lên',
      label: 'Đi lên cây tiến trình',
      placeholder: 'Thả bước đi lên',
      answer: 'parent_of[pid]',
    },
  },
  bank: [
    {
      id: 'opt_1_correct',
      label: 'name == program',
      slot: 1,
    },
    {
      id: 'opt_1_trap',
      label: 'name != program',
      slot: 1,
      trap: 'Toán tử != có nghĩa là "khác". Điều kiện này làm count tăng khi tên tiến trình khác program, nên hàm đang đếm nhầm các chương trình khác.\n\nCần đúng name == program để chỉ đếm những tiến trình có tên trùng với chương trình cần tìm.',
    },
    {
      id: 'opt_2_correct',
      label: 'parent_of[row_pid] = row_ppid',
      slot: 2,
    },
    {
      id: 'opt_2_trap',
      label: 'parent_of[row_ppid] = row_pid',
      slot: 2,
      trap: 'Lưu PID cha theo PID con để tra cứu từ con lên cha. parent_of[row_ppid] = row_pid đảo ngược quan hệ và có thể ghi đè các tiến trình con cùng cha.',
    },
    {
      id: 'opt_3_correct',
      label: 'parent_of[pid]',
      slot: 3,
    },
    {
      id: 'opt_3_trap',
      label: 'pid',
      slot: 3,
      trap: 'Lấy PID cha làm bước tiếp theo trên cây. Chỉ dùng pid sẽ giữ nguyên tiến trình hiện tại, khiến vòng lặp không đi lên được.',
    },
  ],
  successExplanations: [
    {
      slotNumber: 1,
      code: 'name == program',
      explanation: 'Chỉ đếm tiến trình có tên trùng với program. Dùng name != program sẽ đếm các tiến trình có tên khác.',
    },
    {
      slotNumber: 2,
      code: 'parent_of[row_pid] = row_ppid',
      explanation: 'Lưu PID cha theo PID con để tra cứu từ con lên cha. parent_of[row_ppid] = row_pid đảo ngược quan hệ và có thể ghi đè các tiến trình con cùng cha.',
    },
    {
      slotNumber: 3,
      code: 'parent_of[pid]',
      explanation: 'Lấy PID cha làm bước tiếp theo trên cây. Chỉ dùng pid sẽ giữ nguyên tiến trình hiện tại, khiến vòng lặp không đi lên được.',
    },
  ],
};

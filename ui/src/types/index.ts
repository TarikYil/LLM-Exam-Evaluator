export type ProgressMessage = {
  type: "progress";
  job_id: string;
  payload: {
    question_id: string;
    normalized_score: number;
    question_text?: string;
    student_answer: string;
    key_answer: string;
    student_name?: string;
    reasoning_tr?: string;
    tips_tr?: string;
    overall_comment?: string;
  };
};

export type SummaryMessage = {
  type: "summary";
  job_id: string;
  payload: {
    total_score: number;
    average_score: number;
    strengths: string[];
    weaknesses: string[];
    overall_feedback: string;
    general_comment: string;
  };
};

export type DoneMessage = { type: "done"; job_id: string; payload: { message: string } };
export type ErrorMessage = { type: "error"; job_id: string; payload: { message: string } };

export type WsMessage = ProgressMessage | SummaryMessage | DoneMessage | ErrorMessage;

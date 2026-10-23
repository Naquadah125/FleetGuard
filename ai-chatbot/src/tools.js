import axios from 'axios';

/**
 * Gemini Tool / Function Calling Declarations
 */
export const geminiToolDeclarations = [
  {
    name: 'query_user_drowsiness_stats',
    description: 'Truy vấn thống kê mệt mỏi, buồn ngủ (drowsy), ngáp (yawn), xao nhãng và các khung giờ rủi ro cao từ các phiên lái xe của tài xế.',
    parameters: {
      type: 'OBJECT',
      properties: {
        driver_id: {
          type: 'STRING',
          description: 'Mã định danh tài xế.'
        },
        timeframe: {
          type: 'STRING',
          description: 'Khoảng thời gian: "today", "week", "all".'
        }
      }
    }
  },
  {
    name: 'get_fleet_safety_summary',
    description: 'Tổng hợp báo cáo an toàn toàn hệ thống dành cho Admin (tổng số vi phạm cấp 2, tài xế có nguy cơ cao nhất, số ca lái đêm).',
    parameters: {
      type: 'OBJECT',
      properties: {
        timeframe: {
          type: 'STRING',
          description: 'Khoảng thời gian: "today", "week", "month", "all".'
        },
        min_safety_score: {
          type: 'INTEGER',
          description: 'Lọc tài xế có điểm an toàn dưới ngưỡng này (VD: 90).'
        }
      }
    }
  },
  {
    name: 'query_emotion_stats',
    description: 'Truy vấn thống kê cảm xúc, tỷ lệ tập trung vs mất tập trung, và số lượng cảnh báo nguy hiểm của tài xế hoặc toàn bộ đội xe.',
    parameters: {
      type: 'OBJECT',
      properties: {
        driver_id: {
          type: 'STRING',
          description: 'Mã định danh tài xế (VD: drv_test_01). Để trống để xem toàn đội xe.'
        },
        session_id: {
          type: 'STRING',
          description: 'Mã phiên hành trình cụ thể.'
        },
        start_date: {
          type: 'STRING',
          description: 'Thời gian bắt đầu lọc dữ liệu theo chuẩn ISO (VD: 2026-10-14T00:00:00Z).'
        },
        end_date: {
          type: 'STRING',
          description: 'Thời gian kết thúc lọc dữ liệu theo chuẩn ISO.'
        },
        metric_type: {
          type: 'STRING',
          description: 'Loại chỉ số cần xem: "ALL", "EMOTION", "ATTENTION", "ALERTS".'
        }
      }
    }
  },
  {
    name: 'get_video_emotion_breakdown',
    description: 'Lấy timeline phân tích cảm xúc chi tiết và danh sách mốc thời gian vi phạm trong video hành trình đã upload.',
    parameters: {
      type: 'OBJECT',
      properties: {
        video_id: {
          type: 'STRING',
          description: 'Mã định danh ID của video đã phân tích.'
        },
        threshold_level: {
          type: 'INTEGER',
          description: 'Lọc cấp độ cảnh báo tối thiểu: 1 (Cảnh báo) hoặc 2 (Nguy hiểm khẩn cấp).'
        }
      },
      required: ['video_id']
    }
  }
];

export const adminGeminiToolDeclarations = [
  {
    name: 'resolve_admin_analytics',
    description: 'Query approved fleet analytics for the authenticated Admin’s organization.',
    parameters: {
      type: 'OBJECT',
      properties: {
        intent: {
          type: 'STRING',
          enum: ['overview', 'alerts', 'emotions', 'ranking'],
          description: 'Analytics category to return.'
        },
        requested_days: {
          type: 'INTEGER',
          description: 'Requested lookback period in days; defaults to 7 and may expand when no records exist.'
        }
      },
      required: ['intent']
    }
  }
];

/**
 * Execute tool against Backend REST API
 * @param {string} name Tool function name
 * @param {Object} args Tool arguments
 * @param {Object} context Execution context (backendUrl, authToken)
 * @returns {Promise<Object>} Data payload
 */
export async function executeTool(name, args = {}, context = {}) {
  const backendUrl = context.backendUrl || process.env.BACKEND_URL || 'http://localhost:5000';
  const headers = {};
  if (context.authToken) {
    headers['Authorization'] = `Bearer ${context.authToken}`;
  }

  try {
    if (name === 'query_emotion_stats') {
      const params = {};
      if (args.driver_id) params.driver_id = args.driver_id;
      if (args.session_id) params.session_id = args.session_id;
      if (args.start_date) params.start_date = args.start_date;
      if (args.end_date) params.end_date = args.end_date;

      const res = await axios.get(`${backendUrl}/api/analytics/emotions`, {
        params,
        headers,
        timeout: 5000
      });

      return {
        tool: 'query_emotion_stats',
        status: 'SUCCESS',
        data: res.data
      };
    }

    if (name === 'get_video_emotion_breakdown') {
      const res = await axios.get(`${backendUrl}/api/analytics/videos/${args.video_id}`, {
        headers,
        timeout: 5000
      });

      let analysis = res.data.analysis;
      if (args.threshold_level && analysis && analysis.violations) {
        analysis = {
          ...analysis,
          violations: analysis.violations.filter(v => v.alert_level >= args.threshold_level)
        };
      }

      return {
        tool: 'get_video_emotion_breakdown',
        status: 'SUCCESS',
        data: analysis
      };
    }

    return {
      tool: name,
      status: 'ERROR',
      error: `Unknown tool: ${name}`
    };
  } catch (err) {
    return {
      tool: name,
      status: 'ERROR',
      error: err.response?.data?.message || err.message
    };
  }
}

export default {
  geminiToolDeclarations,
  adminGeminiToolDeclarations,
  executeTool
};

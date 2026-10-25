/**
 * Credits System Configuration
 * Token-based consumption model for AI and other features
 */

/**
 * Fixed consumption config type
 * Can be a simple number or an object with default and model-specific costs
 */
export type FixedConsumptionConfig = number | {
  default: number;
  models?: Record<string, number>;
};

export const creditsConfig = {
  /** Paid rap-video credits have their own ledger; registration grants no credit. */
  signupBonus: { enabled: false, amount: 40 },
  /**
   * Consumption mode: 'fixed' or 'dynamic'
   * - fixed: Each operation consumes a fixed amount of credits
   * - dynamic: Credits consumed based on actual token usage
   */
  consumptionMode: 'dynamic' as 'fixed' | 'dynamic',

  /**
   * Fixed consumption amounts (used when consumptionMode is 'fixed')
   * 
   * Each entry can be:
   * - A number: Simple fixed cost for all operations
   * - An object: { default: number, models?: { modelName: number } }
   */
  fixedConsumption: {
    /**
     * AI Chat Credits
     * Simple number = same cost for all models
     * Object = model-specific pricing
     */
    aiChat: 1 as FixedConsumptionConfig,

    /**
     * AI Image Generation Credits
     * Model names are globally unique, so no need to nest by provider
     */
    aiImage: {
      default: 10,
      models: {
        'qwen-image-3.0-pro': 8,
        'qwen-image-3.0': 5,
        'reve/2.1/text-to-image': 12,
        'bytedance/seedream/v5/pro/text-to-image': 12,
        'fal-ai/flux-2-pro': 10,
        'gpt-image-2': 15,
        'gemini-3.1-flash-image-preview': 10,
        'gemini-3-pro-image-preview': 15,
      },
    } as FixedConsumptionConfig,

    /**
     * AI Video Generation Credits
     * Video generation costs more than images due to compute requirements
     */
    aiVideo: {
      default: 30,
      models: {
        'minimax-h3': 40,
        'fal-ai/kling-video/v3/pro/text-to-video': 35,
        'fal-ai/kling-video/v3/pro/image-to-video': 35,
        'fal-ai/veo3.1': 45,
        'fal-ai/veo3.1/image-to-video': 45,
        'doubao-seedance-2-5-260628': 40,
        'doubao-seedance-2-0-260128': 35,
        'wan3.0-video': 25,
        // Prime is faster and costs more at the provider than Standard.
        'wan3.0-video-prime': 35,
      },
    } as FixedConsumptionConfig,
  },

  /**
   * Dynamic consumption settings (used when consumptionMode is 'dynamic')
   */
  dynamicConsumption: {
    // Tokens to credits conversion ratio
    tokensPerCredit: 1000,  // 1000 tokens = 1 credit

    /**
     * Model-specific multipliers (adjust pricing per model)
     * Base credit = tokens / tokensPerCredit
     * Final credit = Base * multiplier
     */
    modelMultipliers: {
      'gpt-5.6-sol': 2.0,
      'qwen3.8-max': 1.2,
      'gpt-5.6-terra': 1.2,
      'qwen3.7-plus': 1.0,
      'deepseek-v4-pro': 1.0,
      'deepseek-v4-flash': 0.8,
      'gpt-5.6-luna': 0.6,
      'qwen3.7-flash': 0.5,
      'default': 1.0
    } as Record<string, number>
  }
} as const;

/**
 * Helper to resolve fixed consumption config to a number
 * @param config The fixed consumption config (number or object)
 * @param model Optional model name for model-specific pricing
 */
export function resolveFixedConsumption(
  config: FixedConsumptionConfig,
  model?: string
): number {
  // Simple number case
  if (typeof config === 'number') {
    return config;
  }
  
  // Object case: check model-specific pricing first
  if (model && config.models?.[model] !== undefined) {
    return config.models[model];
  }
  
  // Fall back to default
  return config.default;
}

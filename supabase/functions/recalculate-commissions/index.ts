import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Sale {
  id: string;
  operator_id: string;
  partner_id: string;
  sale_type: string;
  client_nif: string;
  loyalty_months: number;
  contract_value: number;
  previous_monthly_value: number;
  new_monthly_value: number;
  potencia: string | null;
  client_category_id: string | null;
  client_type: string | null;
  portfolio_status: string | null;
  commission_seller: number;
  commission_partner: number;
}

interface CommissionRule {
  id: string;
  sale_type: string;
  nif_type: string;
  calculation_method: string;
  depends_on_loyalty: boolean;
  loyalty_months: number | null;
  applies_to_seller: boolean;
  applies_to_partner: boolean;
  seller_fixed_value: number;
  seller_monthly_multiplier: number;
  partner_fixed_value: number;
  partner_monthly_multiplier: number;
  client_category_id: string | null;
  client_type_filter: string;
  portfolio_filter: string;
  commission_type: string;
}

interface CommissionSetting {
  id: string;
  operator_id: string;
  partner_id: string | null;
  commission_type: string;
  nif_differentiation: boolean;
}

function getNifType(nif: string): string {
  if (!nif || nif.length < 1) return "all";
  const firstChar = nif.charAt(0);
  if (firstChar === "5") return "5xx";
  if (["1", "2", "3"].includes(firstChar)) return "123xxx";
  return "all";
}

async function findApplicableRule(
  supabase: any,
  settingId: string,
  saleType: string,
  clientNif: string,
  loyaltyMonths: number,
  clientCategoryId: string | null,
  clientType: string | null,
  portfolioStatus: string | null,
  nifDifferentiation: boolean
): Promise<CommissionRule | null> {
  const { data: rules, error } = await supabase
    .from("operator_commission_rules")
    .select("*")
    .eq("setting_id", settingId);

  if (error || !rules || rules.length === 0) return null;

  const nifType = nifDifferentiation ? getNifType(clientNif) : "all";

  let applicableRules = rules.filter((rule: CommissionRule) => {
    if (rule.sale_type !== saleType) return false;
    if (rule.nif_type !== "all" && rule.nif_type !== nifType) return false;
    if (rule.depends_on_loyalty && rule.loyalty_months !== loyaltyMonths) return false;
    if (!rule.depends_on_loyalty && rule.loyalty_months !== null) return false;

    if (rule.client_type_filter !== "all" && rule.client_type_filter !== clientType) return false;

    if (rule.portfolio_filter !== "all") {
      if (clientType !== "empresarial" || rule.portfolio_filter !== portfolioStatus) {
        return false;
      }
    }

    return true;
  });

  if (clientCategoryId && applicableRules.length > 0) {
    const categorySpecificRules = applicableRules.filter(
      (rule: CommissionRule) => rule.client_category_id === clientCategoryId
    );

    if (categorySpecificRules.length > 0) {
      return categorySpecificRules[0];
    }

    const generalCategoryRules = applicableRules.filter(
      (rule: CommissionRule) => rule.client_category_id === null
    );

    if (generalCategoryRules.length > 0) {
      return generalCategoryRules[0];
    }
  }

  if (applicableRules.length > 0) {
    return applicableRules[0];
  }

  const fallbackRules = rules.filter((rule: CommissionRule) => {
    if (rule.sale_type !== saleType) return false;
    if (rule.nif_type !== "all") return false;
    if (rule.depends_on_loyalty) return false;
    if (rule.client_category_id !== null) return false;
    if (rule.client_type_filter !== "all") return false;
    if (rule.portfolio_filter !== "all") return false;
    return true;
  });

  return fallbackRules.length > 0 ? fallbackRules[0] : null;
}

async function calculateCommission(
  supabase: any,
  rule: CommissionRule,
  monthlyValue: number,
  previousMonthlyValue: number,
  newMonthlyValue: number,
  saleType: string,
  potencia: string | null
): Promise<{ seller: number; partner: number }> {
  if (!rule) return { seller: 0, partner: 0 };

  if (rule.commission_type === "per_power") {
    if (!potencia) return { seller: 0, partner: 0 };

    const { data: powerValues } = await supabase
      .from("power_commission_values")
      .select("*")
      .eq("rule_id", rule.id);

    if (!powerValues || powerValues.length === 0) return { seller: 0, partner: 0 };

    const powerCommission = powerValues.find((pv: any) => pv.power_value === potencia);

    if (!powerCommission) return { seller: 0, partner: 0 };

    return {
      seller: parseFloat((powerCommission.seller_commission || 0).toFixed(2)),
      partner: parseFloat((powerCommission.partner_commission || 0).toFixed(2)),
    };
  }

  let baseValue = 0;

  if (rule.calculation_method === "fixed_per_quantity") {
    baseValue = 1;
  } else if (rule.calculation_method === "monthly_multiple") {
    if (saleType === "Up_sell" || saleType === "Cross_sell") {
      const diff = (newMonthlyValue || 0) - (previousMonthlyValue || 0);
      baseValue = Math.max(0, diff);
    } else {
      baseValue = monthlyValue || 0;
    }
  }

  const sellerCommission = rule.applies_to_seller
    ? rule.calculation_method === "fixed_per_quantity"
      ? rule.seller_fixed_value * baseValue
      : rule.seller_monthly_multiplier * baseValue
    : 0;

  const partnerCommission = rule.applies_to_partner
    ? rule.calculation_method === "fixed_per_quantity"
      ? rule.partner_fixed_value * baseValue
      : rule.partner_monthly_multiplier * baseValue
    : 0;

  return {
    seller: parseFloat(sellerCommission.toFixed(2)),
    partner: parseFloat(partnerCommission.toFixed(2)),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sales, error: fetchError } = await supabase
      .from("sales")
      .select("*")
      .eq("commission_seller", 0)
      .eq("commission_partner", 0)
      .not("sale_type", "is", null)
      .not("operator_id", "is", null)
      .not("partner_id", "is", null);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    const { data: allSettings, error: settingsError } = await supabase
      .from("operator_commission_settings")
      .select("*")
      .eq("commission_type", "automatic");

    if (settingsError) {
      throw new Error(`Settings fetch error: ${settingsError.message}`);
    }

    const salesWithSettings = sales?.filter((sale) => {
      return allSettings?.some(
        (setting) =>
          setting.operator_id === sale.operator_id &&
          (setting.partner_id === sale.partner_id || setting.partner_id === null)
      );
    });

    const results = {
      total: salesWithSettings?.length || 0,
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    };

    if (!salesWithSettings || salesWithSettings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhuma venda encontrada para recalcular",
          results,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    for (const sale of salesWithSettings) {
      results.processed++;

      try {
        const settings = allSettings?.filter(
          (s) =>
            s.operator_id === sale.operator_id &&
            (s.partner_id === sale.partner_id || s.partner_id === null)
        );

        if (!settings || settings.length === 0) {
          results.skipped++;
          continue;
        }

        const setting = settings.find((s: any) => s.partner_id === sale.partner_id) || settings[0];

        const rule = await findApplicableRule(
          supabase,
          setting.id,
          sale.sale_type,
          sale.client_nif,
          sale.loyalty_months || 0,
          sale.client_category_id,
          sale.client_type,
          sale.portfolio_status,
          setting.nif_differentiation
        );

        if (!rule) {
          results.skipped++;
          results.details.push({
            sale_id: sale.id.slice(0, 8),
            status: "skipped",
            reason: "Nenhuma regra aplicável encontrada",
          });
          continue;
        }

        const commissions = await calculateCommission(
          supabase,
          rule,
          parseFloat(sale.contract_value) || 0,
          parseFloat(sale.previous_monthly_value) || 0,
          parseFloat(sale.new_monthly_value) || 0,
          sale.sale_type,
          sale.potencia
        );

        const { error: updateError } = await supabase
          .from("sales")
          .update({
            commission_seller: commissions.seller,
            commission_partner: commissions.partner,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sale.id);

        if (updateError) {
          results.errors++;
          results.details.push({
            sale_id: sale.id.slice(0, 8),
            status: "error",
            reason: updateError.message,
          });
        } else {
          results.updated++;
          results.details.push({
            sale_id: sale.id.slice(0, 8),
            status: "updated",
            seller_commission: commissions.seller,
            partner_commission: commissions.partner,
          });
        }
      } catch (err) {
        results.errors++;
        results.details.push({
          sale_id: sale.id.slice(0, 8),
          status: "error",
          reason: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Recálculo concluído: ${results.updated} vendas atualizadas, ${results.skipped} ignoradas, ${results.errors} erros`,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

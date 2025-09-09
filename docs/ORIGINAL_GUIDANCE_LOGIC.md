# 🎯 Pôvodná Logika Guidance - Z PHP Aplikácie

## 🔍 **Ako Bolo Riešené Guidance v Pôvodnom Kóde:**

### **1. Period Matching Logic**

```php
function periodsMatch($guidance, $item) {
    // Strict matching required
    if (empty($guidance['fiscal_period']) || empty($guidance['fiscal_year'])) {
        return false; // No guidance period info
    }
    if (empty($item['fiscal_period']) || empty($item['fiscal_year'])) {
        return false; // No estimate period info
    }

    // Normalize period formats for comparison
    $guidancePeriod = normalizePeriod($guidance['fiscal_period']);
    $estimatePeriod = normalizePeriod($item['fiscal_period']);

    return $guidancePeriod === $estimatePeriod &&
           $guidance['fiscal_year'] == $item['fiscal_year'];
}

function normalizePeriod($period) {
    // Normalize different period formats to standard Q1-Q4, H1/H2, FY
    $period = strtoupper(trim($period));
    switch ($period) {
        case '1H': case 'H1': return 'H1';
        case '2H': case 'H2': return 'H2';
        case '3Q': case 'Q3': return 'Q3';
        case '4Q': case 'Q4': return 'Q4';
        case 'Q1': case 'Q2': return $period;
        case 'FY': return 'FY';
        default: return $period;
    }
}
```

### **2. Method Validation**

```php
function methodOk($guidanceMethod, $estimateMethod) {
    // Allow calculation if either method is null (unknown)
    // Only block if both are known and different
    if ($guidanceMethod === null || $estimateMethod === null) return true;
    return $guidanceMethod === $estimateMethod;
}

function canCompare($guide, $est, $guidanceMethod, $estimateMethod) {
    if (!$guide || !$est) return false;
    if ($est == 0) return false;
    if (!periodsMatch($guide, $est)) return false;
    if (!methodOk($guidanceMethod, $estimateMethod)) return false;
    return true;
}
```

### **3. Extreme Value Detection**

```php
function isExtremeValue($value) {
    return abs($value) > 300; // Flag values above 300% as potentially extreme
}
```

### **4. EPS Guidance Surprise Fallback Logic**

```php
// EPS Guide Surprise Fallback with strict validation
if ($item['eps_guide_surprise_consensus'] !== null) {
    // 1. PRIORITA: Use vendor consensus if available
    $item['eps_guide_surprise'] = $item['eps_guide_surprise_consensus'];
    $item['eps_guide_basis'] = 'vendor_consensus';
    $item['eps_guide_extreme'] = isExtremeValue($item['eps_guide_surprise']);
} elseif (canCompare(
    ['fiscal_period' => $item['guidance_fiscal_period'], 'fiscal_year' => $item['guidance_fiscal_year']],
    ['fiscal_period' => $item['fiscal_period'], 'fiscal_year' => $item['fiscal_year']],
    $item['guidance_eps_method'] ?? null,
    null
) && $item['eps_guide'] !== null && $item['eps_estimate'] !== null && $item['eps_estimate'] != 0) {
    // 2. FALLBACK: Guidance vs estimate (with strict period/method matching)
    $item['eps_guide_surprise'] = (($item['eps_guide'] - $item['eps_estimate']) / $item['eps_estimate']) * 100;
    $item['eps_guide_basis'] = 'estimate';
    $item['eps_guide_extreme'] = isExtremeValue($item['eps_guide_surprise']);

    // Log for monitoring
    if ($item['eps_guide_extreme']) {
        error_log("EXTREME EPS: {$item['ticker']} = {$item['eps_guide_surprise']}% (guidance: {$item['eps_guide']}, estimate: {$item['eps_estimate']}) - periods: {$item['guidance_fiscal_period']}/{$item['guidance_fiscal_year']} vs {$item['fiscal_period']}/{$item['fiscal_year']}");
    }
} elseif (
    $item['eps_guide'] !== null &&
    $item['previous_min_eps_guidance'] !== null &&
    $item['previous_max_eps_guidance'] !== null &&
    $item['previous_min_eps_guidance'] != 0 &&
    $item['previous_max_eps_guidance'] != 0
) {
    // 3. FALLBACK: guidance vs previous guidance midpoint (only if both min/max exist)
    $midpoint = ($item['previous_min_eps_guidance'] + $item['previous_max_eps_guidance']) / 2;
    if ($midpoint != 0) {
        $item['eps_guide_surprise'] = (($item['eps_guide'] - $midpoint) / $midpoint) * 100;
        $item['eps_guide_basis'] = 'previous_mid';
        $item['eps_guide_extreme'] = isExtremeValue($item['eps_guide_surprise']);
    } else {
        $item['eps_guide_surprise'] = null;
        $item['eps_guide_basis'] = null;
        $item['eps_guide_extreme'] = false;
    }
} else {
    $item['eps_guide_surprise'] = null;
    $item['eps_guide_basis'] = null;
    $item['eps_guide_extreme'] = false;
}
```

### **5. Revenue Guidance Surprise Fallback Logic**

```php
// Revenue Guide Surprise Fallback with strict validation
if ($item['revenue_guide_surprise_consensus'] !== null) {
    // 1. PRIORITA: Use vendor consensus if available
    $item['revenue_guide_surprise'] = $item['revenue_guide_surprise_consensus'];
    $item['revenue_guide_basis'] = 'vendor_consensus';
    $item['revenue_guide_extreme'] = isExtremeValue($item['revenue_guide_surprise']);
} elseif (canCompare(
    ['fiscal_period' => $item['guidance_fiscal_period'], 'fiscal_year' => $item['guidance_fiscal_year']],
    ['fiscal_period' => $item['fiscal_period'], 'fiscal_year' => $item['fiscal_year']],
    $item['guidance_revenue_method'] ?? null,
    null
) && $item['revenue_guide'] !== null && $item['revenue_estimate'] !== null && $item['revenue_estimate'] != 0) {
    // 2. FALLBACK: Guidance vs estimate (with strict period/method matching)
    $item['revenue_guide_surprise'] = (($item['revenue_guide'] - $item['revenue_estimate']) / $item['revenue_estimate']) * 100;
    $item['revenue_guide_basis'] = 'estimate';
    $item['revenue_guide_extreme'] = isExtremeValue($item['revenue_guide_surprise']);

    // Log for monitoring
    if ($item['revenue_guide_extreme']) {
        error_log("EXTREME REVENUE: {$item['ticker']} = {$item['revenue_guide_surprise']}% (guidance: {$item['revenue_guide']}, estimate: {$item['revenue_estimate']}) - periods: {$item['guidance_fiscal_period']}/{$item['guidance_fiscal_year']} vs {$item['fiscal_period']}/{$item['fiscal_year']}");
    }
} elseif (
    $item['revenue_guide'] !== null &&
    $item['previous_min_revenue_guidance'] !== null &&
    $item['previous_max_revenue_guidance'] !== null &&
    $item['previous_min_revenue_guidance'] != 0 &&
    $item['previous_max_revenue_guidance'] != 0
) {
    // 3. FALLBACK: guidance vs previous guidance midpoint (only if both min/max exist)
    $midpoint = ($item['previous_min_revenue_guidance'] + $item['previous_max_revenue_guidance']) / 2;
    if ($midpoint != 0) {
        $item['revenue_guide_surprise'] = (($item['revenue_guide'] - $midpoint) / $midpoint) * 100;
        $item['revenue_guide_basis'] = 'previous_mid';
        $item['revenue_guide_extreme'] = isExtremeValue($item['revenue_guide_surprise']);
    } else {
        $item['revenue_guide_surprise'] = null;
        $item['revenue_guide_basis'] = null;
        $item['revenue_guide_extreme'] = false;
    }
} else {
    $item['revenue_guide_surprise'] = null;
    $item['revenue_guide_basis'] = null;
    $item['revenue_guide_extreme'] = false;
}
```

---

## 🎯 **KĽÚČOVÉ RIEŠENIA:**

### **1. Strict Period Matching**

- **Normalizácia period**: Q1, 1Q → Q1; FY, FULL YEAR → FY
- **Strict matching**: Guidance period musí presne zodpovedať estimate period
- **Year matching**: Fiscal year musí byť rovnaký

### **2. Method Validation**

- **GAAP vs. Non-GAAP**: Len ak sú oba známe a rôzne, blokuje sa comparison
- **Null tolerance**: Ak je jeden method null, povolí sa comparison

### **3. Fallback Hierarchy**

1. **Vendor Consensus** (najvyššia priorita)
2. **Guidance vs. Estimate** (s strict period/method matching)
3. **Guidance vs. Previous Guidance Midpoint** (len ak existujú min/max)

### **4. Extreme Value Detection**

- **Threshold**: 300% (absolútna hodnota)
- **Logging**: Automatické logovanie extreme values
- **Monitoring**: Trackovanie pre debugging

### **5. Error Handling**

- **Graceful degradation**: Ak nie je možné porovnať, nastaví sa null
- **Basis tracking**: Sleduje sa zdroj calculation (vendor_consensus, estimate, previous_mid)
- **Extreme flagging**: Označuje sa potenciálne problematické hodnoty

---

## 🚨 **PROBLÉM S BENZINGA:**

### **Kvartálne vs. Ročné Údaje**

Pôvodný kód **NIE riešil** problém s kvartálnymi vs. ročnými údajmi z Benzinga!

**Chýbajúce riešenie:**

- ❌ **Period detection**: Neriešilo sa, či je guidance kvartálne alebo ročné
- ❌ **Ratio analysis**: Neriešilo sa, či je ratio 4x (kvartálne vs. ročné)
- ❌ **Smart adjustment**: Neriešilo sa automatické upravenie guidance
- ❌ **Confidence scoring**: Neriešilo sa, ako spoľahlivé je period matching

---

## 🎯 **ZÁVER:**

**Pôvodný kód mal sofistikovanú logiku pre guidance, ale NIE riešil problém s Benzinga kvartálnymi vs. ročnými údajmi!**

**Potrebujeme implementovať:**

1. ✅ **Smart period detection** (ako som navrhol)
2. ✅ **Ratio analysis** (3.5-4.5x = kvartálne vs. ročné)
3. ✅ **Confidence scoring** (0-100%)
4. ✅ **Automatic adjustment** (upravenie guidance na správny period)
5. ✅ **Warning system** (upozornenie na nízku confidence)

**Chcete, aby som implementoval túto logiku v novej aplikácii?** 🤔

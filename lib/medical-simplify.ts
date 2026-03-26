// ---------------------------------------------------------------------------
// Medical jargon → plain language mapping for Simple Reports
// Shared across all report types (Books, PubMed, Other Research)
// ---------------------------------------------------------------------------

const MEDICAL_SIMPLIFICATIONS: [RegExp, string][] = [
  // Conditions & anatomy
  [/\bhypertension\b/gi, "high blood pressure"],
  [/\bhypotension\b/gi, "low blood pressure"],
  [/\bhyperlipidemia\b/gi, "high cholesterol"],
  [/\bdyslipidemia\b/gi, "abnormal cholesterol levels"],
  [/\bhyperglycemia\b/gi, "high blood sugar"],
  [/\bhypoglycemia\b/gi, "low blood sugar"],
  [/\bhypoxia\b/gi, "low oxygen levels"],
  [/\bhypoxemia\b/gi, "low oxygen in the blood"],
  [/\bedema\b/gi, "swelling"],
  [/\berythema\b/gi, "redness"],
  [/\bneoplasm\b/gi, "tumor"],
  [/\bmalignant neoplasm\b/gi, "cancer"],
  [/\bbenign\b/gi, "not cancerous"],
  [/\bmalignant\b/gi, "cancerous"],
  [/\bmetastasis\b/gi, "cancer spread"],
  [/\bmetastases\b/gi, "cancer that has spread"],
  [/\bmetastatic\b/gi, "cancer that has spread"],
  [/\bischemia\b/gi, "reduced blood flow"],
  [/\bischemic\b/gi, "caused by reduced blood flow"],
  [/\bthrombosis\b/gi, "blood clot"],
  [/\bthromb(?:i|us)\b/gi, "blood clot"],
  [/\bembolism\b/gi, "blockage from a blood clot"],
  [/\bstenosis\b/gi, "narrowing"],
  [/\barrhythmia\b/gi, "irregular heartbeat"],
  [/\btachycardia\b/gi, "fast heart rate"],
  [/\bbradycardia\b/gi, "slow heart rate"],
  [/\bdyspnea\b/gi, "difficulty breathing"],
  [/\bdysphagia\b/gi, "difficulty swallowing"],
  [/\bnausea\b/gi, "feeling sick to the stomach"],
  [/\bcyanosis\b/gi, "bluish skin color (low oxygen)"],
  [/\bjaundice\b/gi, "yellowing of the skin"],
  [/\balopecia\b/gi, "hair loss"],
  [/\bpruritus\b/gi, "itching"],
  [/\burticaria\b/gi, "hives"],
  [/\bsyncope\b/gi, "fainting"],
  [/\bvertigo\b/gi, "dizziness or spinning sensation"],
  [/\bneuropathy\b/gi, "nerve damage"],
  [/\bmyalgia\b/gi, "muscle pain"],
  [/\barthralgia\b/gi, "joint pain"],
  [/\bcephalgia\b/gi, "headache"],
  [/\bhepatomegaly\b/gi, "enlarged liver"],
  [/\bsplenomegaly\b/gi, "enlarged spleen"],
  [/\bcardiomegaly\b/gi, "enlarged heart"],
  [/\blymphadenopathy\b/gi, "swollen lymph nodes"],
  [/\bascites\b/gi, "fluid buildup in the abdomen"],
  [/\bpleural effusion\b/gi, "fluid around the lungs"],
  [/\bpericardial effusion\b/gi, "fluid around the heart"],
  [/\bpneumothorax\b/gi, "collapsed lung"],
  [/\batelectasis\b/gi, "partial lung collapse"],
  [/\bfibrosis\b/gi, "scarring"],
  [/\bcirrhosis\b/gi, "severe liver scarring"],
  [/\bnephr(?:itis|opathy)\b/gi, "kidney disease"],
  [/\bhepatitis\b/gi, "liver inflammation"],
  [/\bencephalitis\b/gi, "brain inflammation"],
  [/\bmyocarditis\b/gi, "heart muscle inflammation"],
  [/\bpericarditis\b/gi, "inflammation around the heart"],
  [/\bperitonitis\b/gi, "abdominal lining inflammation"],
  [/\bmeningitis\b/gi, "inflammation of brain membranes"],
  [/\bsepsis\b/gi, "life-threatening infection response"],
  [/\bsepticemia\b/gi, "blood infection"],
  [/\banemia\b/gi, "low red blood cell count"],
  [/\bthrombocytopenia\b/gi, "low platelet count"],
  [/\bleukocytosis\b/gi, "high white blood cell count"],
  [/\bleukopenia\b/gi, "low white blood cell count"],
  [/\bneutropenia\b/gi, "low infection-fighting blood cells"],
  [/\bcoagulopathy\b/gi, "blood clotting problems"],

  // Procedures & treatments
  [/\bpercutaneous\b/gi, "through the skin"],
  [/\bintravenous(?:ly)?\b/gi, "into a vein"],
  [/\bsubcutaneous(?:ly)?\b/gi, "under the skin"],
  [/\bintramuscular(?:ly)?\b/gi, "into the muscle"],
  [/\bintrathecal(?:ly)?\b/gi, "into the spinal fluid"],
  [/\bresection\b/gi, "surgical removal"],
  [/\bexcision\b/gi, "surgical cutting out"],
  [/\bablation\b/gi, "procedure to destroy tissue"],
  [/\bdebridement\b/gi, "removal of damaged tissue"],
  [/\banastomosis\b/gi, "surgical connection of two parts"],
  [/\bantibiotics?\b/gi, "infection-fighting medicine"],
  [/\banalgesics?\b/gi, "pain reliever"],
  [/\bantipyretics?\b/gi, "fever-reducing medicine"],
  [/\banticoagulants?\b/gi, "blood thinner"],
  [/\bantiemetics?\b/gi, "anti-nausea medicine"],
  [/\bdiuretics?\b/gi, "water pill"],
  [/\bcorticosteroids?\b/gi, "steroid medicine to reduce inflammation"],
  [/\bimmunosuppressants?\b/gi, "medicine that lowers the immune system"],
  [/\bchemotherapy\b/gi, "cancer-fighting drug treatment"],
  [/\bradiotherapy\b/gi, "radiation treatment"],
  [/\bpalliative care\b/gi, "comfort-focused care"],
  [/\bprophylaxis\b/gi, "preventive treatment"],
  [/\bprophylactic\b/gi, "preventive"],
  [/\bventilation\b/gi, "breathing support machine"],
  [/\bintubation\b/gi, "placing a breathing tube"],
  [/\bdialysis\b/gi, "machine filtering of the blood (kidney replacement)"],
  [/\btransfusion\b/gi, "giving donated blood"],

  // Diagnostic terms
  [/\bbiopsy\b/gi, "tissue sample for testing"],
  [/\bhistology\b/gi, "examination of tissue under a microscope"],
  [/\bhistopatholog\w+\b/gi, "tissue examination under a microscope"],
  [/\bcytology\b/gi, "cell examination"],
  [/\bpathogenesis\b/gi, "how the disease develops"],
  [/\betiology\b/gi, "cause of the disease"],
  [/\bprognosis\b/gi, "expected outcome"],
  [/\bdifferential diagnosis\b/gi, "list of possible conditions"],
  [/\bcomorbidity\b/gi, "other existing health condition"],
  [/\bcomorbidities\b/gi, "other existing health conditions"],
  [/\bacute\b/gi, "sudden or short-term"],
  [/\bchronic\b/gi, "long-lasting"],
  [/\bcongenital\b/gi, "present from birth"],
  [/\bidiopathic\b/gi, "with no known cause"],
  [/\basymptomatic\b/gi, "without symptoms"],
  [/\bsymptomatic\b/gi, "showing symptoms"],
  [/\bbilateral\b/gi, "on both sides"],
  [/\bunilateral\b/gi, "on one side"],
  [/\bcontralateral\b/gi, "on the opposite side"],
  [/\bipsilateral\b/gi, "on the same side"],
  [/\bproximal\b/gi, "closer to the center of the body"],
  [/\bdistal\b/gi, "farther from the center of the body"],
  [/\banterior\b/gi, "front"],
  [/\bposterior\b/gi, "back"],
  [/\bsuperior\b/gi, "upper"],
  [/\binferior\b/gi, "lower"],
  [/\bperipher(?:y|al)\b/gi, "outer area"],
  [/\brenal\b/gi, "kidney"],
  [/\bhepatic\b/gi, "liver"],
  [/\bpulmonary\b/gi, "lung"],
  [/\bcardiac\b/gi, "heart"],
  [/\bcerebral\b/gi, "brain"],
  [/\bgastric\b/gi, "stomach"],
  [/\bvascular\b/gi, "blood vessel"],
  [/\bcardiovascular\b/gi, "heart and blood vessel"],
  [/\bmusculoskeletal\b/gi, "muscle and bone"],
  [/\bgastrointestinal\b/gi, "digestive system"],
  [/\bhematolog\w+\b/gi, "blood-related"],
  [/\boncolog\w+\b/gi, "cancer-related"],
  [/\bneurolog\w+\b/gi, "brain and nerve related"],
  [/\bimmunolog\w+\b/gi, "immune system related"],
  [/\bendocrin\w+\b/gi, "hormone-related"],

  // Common abbreviations
  [/\bBID\b/g, "twice daily"],
  [/\bTID\b/g, "three times daily"],
  [/\bQID\b/g, "four times daily"],
  [/\bPRN\b/g, "as needed"],
  [/\bPO\b/g, "by mouth"],
  [/\bIV\b/g, "into a vein"],
  [/\bIM\b/g, "into the muscle"],
  [/\bSC\b/g, "under the skin"],
  [/\bq\.?d\.?\b/g, "once daily"],
  [/\bSx\b/g, "symptoms"],
  [/\bDx\b/g, "diagnosis"],
  [/\bTx\b/g, "treatment"],
  [/\bHx\b/g, "history"],
  [/\bRx\b/g, "prescription"],
];

/** Replace medical jargon with plain-language equivalents. */
export function simplifyMedicalText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of MEDICAL_SIMPLIFICATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** CSS styles for the simple (plain-language) report variant. */
export const SIMPLE_REPORT_STYLES = `
    @media print { @page { margin: 0.8in; } body { font-size: 14px; } }
    body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; max-width: 750px; margin: 0 auto; padding: 40px 24px; line-height: 2; }
    h1 { font-size: 24px; border-bottom: 3px solid #16a34a; padding-bottom: 10px; margin-bottom: 4px; color: #14532d; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 20px; }
    h2 { font-size: 18px; color: #15803d; margin-top: 36px; margin-bottom: 16px; border-bottom: 1px solid #dcfce7; padding-bottom: 8px; }
    .section { margin-bottom: 32px; }
    .section p { font-size: 15px; color: #334155; margin: 0 0 20px 0; text-align: left; line-height: 2; }
    .section p:last-child { margin-bottom: 0; }
    .section ul { margin: 0 0 20px 24px; padding: 0; list-style: disc; }
    .section ul li { font-size: 15px; color: #334155; margin-bottom: 10px; line-height: 1.9; }
    sup { font-size: 9px; color: #15803d; font-weight: 600; }
    .disease-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
    .disease-banner h3 { margin: 0; font-size: 17px; color: #14532d; }
    .intro { font-size: 15px; color: #475569; margin-bottom: 28px; line-height: 2; }
    .key-terms { background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
    .key-terms h3 { margin: 0 0 8px 0; font-size: 15px; color: #713f12; }
    .key-terms p { font-size: 14px; color: #78716c; margin: 0; line-height: 1.8; }
    .references { margin-top: 36px; padding-top: 20px; border-top: 2px solid #dcfce7; }
    .references h2 { font-size: 15px; color: #334155; border-bottom: none; margin-bottom: 12px; }
    .references ol { padding-left: 0; list-style: none; }
    .references li { font-size: 12px; color: #475569; margin-bottom: 8px; line-height: 1.6; }
    .references li:last-child { border-bottom: none; }
    .references li strong { color: #15803d; }
    .references a { color: #15803d; text-decoration: none; }
    .ref-detail { color: #94a3b8; }
    .ref-source { color: #94a3b8; }
    .disclaimer { font-size: 12px; color: #94a3b8; margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
    .section-note { font-size: 15px; color: #64748b; font-style: italic; margin-bottom: 18px; line-height: 1.9; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #16a34a; }
`;

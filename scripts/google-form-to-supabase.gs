/**
 * Google Apps Script: sync Form responses to Supabase volunteer_signups.
 *
 * Setup:
 * 1) Form responses must include "Opportunity ID" and "Email" columns.
 * 2) In Script Properties, add:
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 * 3) Install trigger: onFormSubmit -> From spreadsheet -> On form submit.
 */

function onFormSubmit(e) {
  const namedValues = (e && e.namedValues) || {};

  const opportunityId = pickFirstValue(namedValues, ['Opportunity ID', 'opportunity_id']);
  const emailRaw = pickFirstValue(namedValues, ['Email', 'email']);
  const fullName = pickFirstValue(namedValues, ['Full Name', 'Name', 'full_name']);
  const responseId = pickFirstValue(namedValues, ['Response ID', 'response_id']);

  if (!opportunityId) {
    throw new Error('Missing Opportunity ID in form response.');
  }

  const email = normalizeEmail(emailRaw);
  if (!email) {
    throw new Error('Missing Email in form response.');
  }

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = String(props.getProperty('SUPABASE_URL') || '').trim();
  const serviceRoleKey = String(props.getProperty('SUPABASE_SERVICE_ROLE_KEY') || '').trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Script Properties.');
  }

  const endpoint =
    supabaseUrl.replace(/\/$/, '') +
    '/rest/v1/volunteer_signups?on_conflict=opportunity_id,email';

  const payload = {
    opportunity_id: opportunityId,
    email: email,
    full_name: fullName || null,
    source: 'google_form',
    external_response_id: responseId || null,
    signed_at: new Date().toISOString(),
  };

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: serviceRoleKey,
      Authorization: 'Bearer ' + serviceRoleKey,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      'Supabase sync failed (' + statusCode + '): ' + response.getContentText()
    );
  }
}

function pickFirstValue(namedValues, keys) {
  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    var raw = namedValues[key];
    if (raw && raw.length > 0) {
      var value = String(raw[0] || '').trim();
      if (value) {
        return value;
      }
    }
  }
  return '';
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

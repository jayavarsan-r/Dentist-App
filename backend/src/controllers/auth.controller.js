const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Valid 10-digit phone required' });
    }
    const otp = process.env.USE_DEV_OTP === 'true'
      ? process.env.DEV_OTP
      : Math.floor(100000 + Math.random() * 900000).toString();
    await supabase.from('otp_codes').delete().eq('phone', phone);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await supabase.from('otp_codes').insert({ phone, code: otp, expires_at: expiresAt });
    if (error) throw error;
    res.json({ success: true, message: 'OTP sent' });
  } catch (e) { next(e); }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const { data: otpRecord } = await supabase.from('otp_codes')
      .select('*').eq('phone', phone).eq('code', otp).eq('used', false)
      .gt('expires_at', new Date().toISOString()).single();
    if (!otpRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });
    await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id);
    let { data: dentist } = await supabase.from('dentists').select('*').eq('phone', phone).single();
    let isNewUser = false;
    if (!dentist) {
      const { data: newDentist, error } = await supabase.from('dentists').insert({ phone }).select().single();
      if (error) throw error;
      dentist = newDentist;
      isNewUser = true;
    }
    const token = jwt.sign({ dentistId: dentist.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, dentist, isNewUser });
  } catch (e) { next(e); }
};

exports.getMe = async (req, res, next) => {
  try {
    const { data: dentist, error } = await supabase.from('dentists').select('*').eq('id', req.dentistId).single();
    if (error) throw error;
    res.json({ dentist });
  } catch (e) { next(e); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, clinic_name, phone } = req.body;
    const { data: dentist, error } = await supabase.from('dentists')
      .update({ name, clinic_name, phone, updated_at: new Date().toISOString() })
      .eq('id', req.dentistId).select().single();
    if (error) throw error;
    res.json({ dentist });
  } catch (e) { next(e); }
};

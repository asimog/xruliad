-- Supabase RPC functions for atomic payment verification transactions
-- These functions ensure payment verification and ad activation happen atomically

-- Function to atomically verify a payment and activate an ad
-- Returns the updated payment and ad records
create or replace function public.verify_payment_and_activate_ad(
  p_payment_id uuid,
  p_tx_hash text,
  p_verified_at timestamptz default now()
)
returns table (
  payment_id uuid,
  ad_id uuid,
  payment_status text,
  ad_status text,
  is_active boolean,
  tx_hash text,
  verified_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments%rowtype;
  v_ad ads%rowtype;
  v_duration_minutes integer;
  v_activation_status text;
  v_is_active boolean;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
begin
  -- Lock the payment row for update
  select * into v_payment
  from payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  -- Check if already verified with this transaction
  if v_payment.status = 'verified' and v_payment.tx_hash = p_tx_hash then
    -- Already verified, return current state
    select * into v_ad from ads where id = v_payment.ad_id;
    return query select 
      v_payment.id,
      v_ad.id,
      v_payment.status,
      v_ad.status,
      v_ad.is_active,
      v_payment.tx_hash,
      v_payment.verified_at;
    return;
  end if;

  -- Lock the ad row for update
  select * into v_ad
  from ads
  where id = v_payment.ad_id
  for update;

  if not found then
    raise exception 'Ad not found for payment';
  end if;

  -- Calculate activation state based on ad type and duration
  v_duration_minutes := coalesce(v_ad.duration_minutes, 5);
  
  if v_duration_minutes > 0 then
    v_activation_status := 'active';
    v_is_active := true;
  else
    v_activation_status := 'pending_streamer_approval';
    v_is_active := false;
  end if;

  v_starts_at := p_verified_at;
  v_expires_at := p_verified_at + (v_duration_minutes * interval '1 minute');

  -- Update payment
  update payments
  set 
    tx_hash = p_tx_hash,
    status = 'verified',
    verified_at = p_verified_at
  where id = p_payment_id
  returning * into v_payment;

  -- Update ad
  update ads
  set 
    payment_tx_signature = p_tx_hash,
    status = v_activation_status,
    is_active = v_is_active,
    starts_at = v_starts_at,
    expires_at = v_expires_at
  where id = v_payment.ad_id
  returning * into v_ad;

  -- Return updated records
  return query select 
    v_payment.id,
    v_ad.id,
    v_payment.status,
    v_ad.status,
    v_ad.is_active,
    v_payment.tx_hash,
    v_payment.verified_at;
end;
$$;

-- Function to atomically verify payment and sweep escrow balance
-- Returns the sweep result along with verification status
create or replace function public.verify_payment_and_sweep_escrow(
  p_payment_id uuid,
  p_tx_hash text,
  p_verified_at timestamptz default now()
)
returns table (
  payment_id uuid,
  ad_id uuid,
  payment_status text,
  deposit_address text,
  streamer_wallet text,
  amount numeric,
  sweep_tx_hash text,
  swept boolean,
  sweep_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments%rowtype;
  v_ad ads%rowtype;
  v_sweep_result record;
begin
  -- Lock the payment row for update
  select * into v_payment
  from payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  -- Check if already verified
  if v_payment.status = 'verified' then
    -- Already verified, return current state
    select * into v_ad from ads where id = v_payment.ad_id;
    return query select 
      v_payment.id,
      v_ad.id,
      v_payment.status,
      v_payment.deposit_address,
      v_ad.paid_to_wallet,
      v_payment.amount,
      null::text as sweep_tx_hash,
      false as swept,
      'already_verified' as sweep_reason;
    return;
  end if;

  -- Lock the ad row for update
  select * into v_ad
  from ads
  where id = v_payment.ad_id
  for update;

  if not found then
    raise exception 'Ad not found for payment';
  end if;

  -- Update payment status first
  update payments
  set 
    tx_hash = p_tx_hash,
    status = 'verified',
    verified_at = p_verified_at
  where id = p_payment_id;

  -- Update ad status
  update ads
  set 
    payment_tx_signature = p_tx_hash,
    status = case 
      when coalesce(v_ad.duration_minutes, 5) > 0 then 'active'
      else 'pending_streamer_approval'
    end,
    is_active = case 
      when coalesce(v_ad.duration_minutes, 5) > 0 then true
      else false
    end,
    starts_at = p_verified_at,
    expires_at = p_verified_at + (coalesce(v_ad.duration_minutes, 5) * interval '1 minute')
  where id = v_payment.ad_id;

  -- Return result (sweep would be done by application logic)
  return query select 
    v_payment.id,
    v_ad.id,
    'verified'::text as payment_status,
    v_payment.deposit_address,
    v_ad.paid_to_wallet,
    v_payment.amount,
    null::text as sweep_tx_hash,
    false as swept,
    'verification_complete' as sweep_reason;
end;
$$;

-- Function to get payment status with ad details atomically
create or replace function public.get_payment_with_ad_status(
  p_payment_id uuid
)
returns table (
  payment_id uuid,
  ad_id uuid,
  payment_status text,
  ad_status text,
  is_active boolean,
  tx_hash text,
  deposit_address text,
  amount numeric,
  currency text,
  streamer_wallet text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query 
  select 
    p.id as payment_id,
    a.id as ad_id,
    p.status as payment_status,
    a.status as ad_status,
    a.is_active,
    p.tx_hash,
    p.deposit_address,
    p.amount,
    p.currency,
    a.paid_to_wallet as streamer_wallet
  from payments p
  join ads a on a.id = p.ad_id
  where p.id = p_payment_id;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function public.verify_payment_and_activate_ad(uuid, text, timestamptz) to authenticated;
grant execute on function public.verify_payment_and_sweep_escrow(uuid, text, timestamptz) to authenticated;
grant execute on function public.get_payment_with_ad_status(uuid) to authenticated;

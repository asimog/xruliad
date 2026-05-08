-- Migration 0008: RLS policies (apply after all tables exist)
-- ============================================================

-- Core identity
alter table users_profile enable row level security;
alter table terminal_sessions enable row level security;
alter table agent_profiles enable row level security;
alter table agent_sessions enable row level security;

-- Agent memory
alter table agent_memories enable row level security;
alter table memory_chunks enable row level security;
alter table agent_messages enable row level security;
alter table agent_tasks enable row level security;
alter table agent_runs enable row level security;
alter table agent_run_steps enable row level security;
alter table agent_tools enable row level security;
alter table agent_artifacts enable row level security;
alter table agent_receipts enable row level security;
alter table agent_audit_logs enable row level security;

-- Commands + Theses
alter table commands enable row level security;
alter table command_runs enable row level security;
alter table command_contributions enable row level security;
alter table command_permissions enable row level security;
alter table theses enable row level security;
alter table thesis_runs enable row level security;
alter table thesis_contributions enable row level security;
alter table thesis_evidence enable row level security;
alter table thesis_model_outputs enable row level security;
alter table thesis_simulations enable row level security;
alter table thesis_media_artifacts enable row level security;
alter table thesis_ad_placements enable row level security;
alter table thesis_research_tasks enable row level security;
alter table thesis_execution_intents enable row level security;

-- Jobs
alter table video_jobs enable row level security;
alter table ad_jobs enable row level security;
alter table research_jobs enable row level security;
alter table simulation_jobs enable row level security;
alter table intelligence_jobs enable row level security;
alter table coding_jobs enable row level security;
alter table display_jobs enable row level security;

-- Payments/approvals
alter table platform_payment_receipts enable row level security;
alter table user_local_payment_receipts_metadata enable row level security;
alter table inference_receipts enable row level security;
alter table paid_api_receipts enable row level security;
alter table spend_policies enable row level security;
alter table risk_policies enable row level security;
alter table approvals enable row level security;
alter table audit_logs enable row level security;
alter table privacy_events enable row level security;
alter table redaction_events enable row level security;

-- GitHub/code
alter table github_repos enable row level security;
alter table github_tasks enable row level security;
alter table github_branches enable row level security;
alter table github_commits enable row level security;
alter table github_pull_requests enable row level security;
alter table github_artifacts enable row level security;
alter table github_publish_events enable row level security;

-- Display/storage/config
alter table display_artifacts enable row level security;
alter table storage_artifacts enable row level security;
alter table artifact_provenance enable row level security;
alter table provider_configs enable row level security;
alter table product_capabilities enable row level security;
alter table runtime_status_snapshots enable row level security;

-- Default policy: authenticated users own their data
-- Public records are readable by all
do $$
declare
  tables_list text[] := array[
    'users_profile', 'terminal_sessions', 'agent_profiles', 'agent_sessions',
    'agent_memories', 'agent_messages', 'agent_tasks', 'agent_runs', 'agent_run_steps', 'agent_tools', 'agent_artifacts', 'agent_receipts', 'agent_audit_logs',
    'commands', 'command_runs', 'command_contributions', 'command_permissions',
    'theses', 'thesis_runs', 'thesis_contributions', 'thesis_evidence', 'thesis_model_outputs', 'thesis_simulations', 'thesis_media_artifacts', 'thesis_ad_placements', 'thesis_research_tasks', 'thesis_execution_intents',
    'video_jobs', 'ad_jobs', 'research_jobs', 'simulation_jobs', 'intelligence_jobs', 'coding_jobs', 'display_jobs',
    'platform_payment_receipts', 'inference_receipts', 'paid_api_receipts', 'spend_policies', 'risk_policies', 'approvals', 'audit_logs', 'privacy_events', 'redaction_events',
    'github_repos', 'github_tasks', 'github_branches', 'github_commits', 'github_pull_requests', 'github_artifacts', 'github_publish_events',
    'display_artifacts', 'storage_artifacts', 'artifact_provenance', 'provider_configs', 'product_capabilities', 'runtime_status_snapshots'
  ];
  tbl text;
begin
  foreach tbl in array tables_list loop
    -- User-owned data: user can select/insert/update/delete their own rows
    execute format('
      drop policy if exists "user_owns_data" on %I;
      create policy "user_owns_data" on %I
        for all
        using (user_id = auth.uid())
        with check (user_id = auth.uid())
    ', tbl, tbl, tbl, tbl);

    -- Service role access bypasses RLS (built into Supabase)
    -- Public read for records with visibility = ''public''
    execute format('
      drop policy if exists "public_read" on %I;
      create policy "public_read" on %I
        for select
        using (visibility = ''public'')
    ', tbl, tbl, tbl);
  end loop;
end;
$$;

-- public_read policy applies to tables with a visibility column; for tables without one,
-- the policy is a no-op. Add schema notes for manual review.
comment on schema public is 'RLS enabled on all tables. User-owned rows: user_id = auth.uid(). Public: visibility = public. Service role bypasses RLS.';

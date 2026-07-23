-- Provenance is cyclic by design (document -> selected source/extraction,
-- job -> result, artifact -> latest version). Defer owner-consistency checks
-- to transaction commit so an auth.users cascade can remove the whole owned
-- graph atomically. Normal writes remain fully checked before commit.

alter table public.document_assets
  drop constraint document_assets_latest_extraction_owner_fkey,
  add constraint document_assets_latest_extraction_owner_fkey
    foreign key (latest_extraction_result_id, user_id)
    references public.extraction_results(id, user_id)
    deferrable initially deferred,
  drop constraint document_assets_selected_source_owner_fkey,
  add constraint document_assets_selected_source_owner_fkey
    foreign key (selected_source_version_id, user_id)
    references public.source_versions(id, user_id)
    deferrable initially deferred;

alter table public.extraction_results
  drop constraint extraction_results_document_owner_fkey,
  add constraint extraction_results_document_owner_fkey
    foreign key (document_asset_id, user_id)
    references public.document_assets(id, user_id)
    deferrable initially deferred,
  drop constraint extraction_results_raw_source_owner_fkey,
  add constraint extraction_results_raw_source_owner_fkey
    foreign key (raw_source_version_id, user_id)
    references public.source_versions(id, user_id)
    deferrable initially deferred,
  drop constraint extraction_results_normalized_source_owner_fkey,
  add constraint extraction_results_normalized_source_owner_fkey
    foreign key (normalized_source_version_id, user_id)
    references public.source_versions(id, user_id)
    deferrable initially deferred;

alter table public.source_versions
  drop constraint source_versions_document_owner_fkey,
  add constraint source_versions_document_owner_fkey
    foreign key (document_asset_id, user_id)
    references public.document_assets(id, user_id)
    deferrable initially deferred,
  drop constraint source_versions_extraction_owner_fkey,
  add constraint source_versions_extraction_owner_fkey
    foreign key (extraction_result_id, user_id)
    references public.extraction_results(id, user_id)
    deferrable initially deferred,
  drop constraint source_versions_parent_owner_fkey,
  add constraint source_versions_parent_owner_fkey
    foreign key (parent_source_version_id, user_id)
    references public.source_versions(id, user_id)
    deferrable initially deferred;

alter table public.generated_artifacts
  drop constraint generated_artifacts_source_owner_fkey,
  add constraint generated_artifacts_source_owner_fkey
    foreign key (source_version_id, user_id)
    references public.source_versions(id, user_id)
    deferrable initially deferred,
  drop constraint generated_artifacts_latest_version_owner_fkey,
  add constraint generated_artifacts_latest_version_owner_fkey
    foreign key (latest_version_id, user_id)
    references public.generated_artifact_versions(id, user_id)
    deferrable initially deferred;

alter table public.generated_artifact_versions
  drop constraint generated_artifact_versions_source_owner_fkey,
  add constraint generated_artifact_versions_source_owner_fkey
    foreign key (source_version_id, user_id)
    references public.source_versions(id, user_id)
    deferrable initially deferred;

alter table public.processing_job_sources
  drop constraint processing_job_sources_document_owner_fkey,
  add constraint processing_job_sources_document_owner_fkey
    foreign key (document_asset_id, user_id)
    references public.document_assets(id, user_id)
    deferrable initially deferred,
  drop constraint processing_job_sources_source_version_owner_fkey,
  add constraint processing_job_sources_source_version_owner_fkey
    foreign key (source_version_id, user_id)
    references public.source_versions(id, user_id)
    deferrable initially deferred;

alter table public.processing_jobs
  drop constraint processing_jobs_source_owner_fkey,
  add constraint processing_jobs_source_owner_fkey
    foreign key (source_snapshot_id, user_id)
    references public.processing_job_sources(id, user_id)
    deferrable initially deferred,
  drop constraint processing_jobs_result_owner_fkey,
  add constraint processing_jobs_result_owner_fkey
    foreign key (result_id, user_id)
    references public.processing_job_results(id, user_id)
    deferrable initially deferred,
  drop constraint processing_jobs_source_version_owner_fkey,
  add constraint processing_jobs_source_version_owner_fkey
    foreign key (source_version_id, user_id)
    references public.source_versions(id, user_id)
    deferrable initially deferred,
  drop constraint processing_jobs_reuse_candidate_owner_fkey,
  add constraint processing_jobs_reuse_candidate_owner_fkey
    foreign key (reuse_candidate_artifact_version_id, user_id)
    references public.generated_artifact_versions(id, user_id)
    deferrable initially deferred;

alter table public.processing_job_results
  drop constraint processing_job_results_source_owner_fkey,
  add constraint processing_job_results_source_owner_fkey
    foreign key (source_snapshot_id, user_id)
    references public.processing_job_sources(id, user_id)
    deferrable initially deferred,
  drop constraint processing_job_results_extraction_owner_fkey,
  add constraint processing_job_results_extraction_owner_fkey
    foreign key (extraction_result_id, user_id)
    references public.extraction_results(id, user_id)
    deferrable initially deferred,
  drop constraint processing_job_results_artifact_version_owner_fkey,
  add constraint processing_job_results_artifact_version_owner_fkey
    foreign key (artifact_version_id, user_id)
    references public.generated_artifact_versions(id, user_id)
    deferrable initially deferred;

alter table public.processing_job_events
  drop constraint processing_job_events_artifact_version_owner_fkey,
  add constraint processing_job_events_artifact_version_owner_fkey
    foreign key (artifact_version_id, user_id)
    references public.generated_artifact_versions(id, user_id)
    deferrable initially deferred;

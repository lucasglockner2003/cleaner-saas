# Go-Live Checklist

## Final pre-launch gates

- [ ] `RELEASE_PREP/production-env-checklist.md` complete.
- [ ] `RELEASE_PREP/smoke-test-checklist.md` complete in staging within last 24h.
- [ ] Critical runtime config report in app has zero blockers.
- [ ] Last migration bundle reviewed and approved.
- [ ] Rollback checkpoint (release tag + DB backup) recorded.

## Cutover steps

1. [ ] Freeze schema-affecting merges.
2. [ ] Apply production migrations.
3. [ ] Deploy webhook runtime and verify `/health`.
4. [ ] Deploy worker runtime and run one manual cycle.
5. [ ] Deploy frontend.
6. [ ] Execute production smoke subset.

## Success criteria (first 60 minutes)

- [ ] Authentication works for internal and portal users.
- [ ] New booking request can be created and reviewed.
- [ ] One visit completion triggers expected communication jobs.
- [ ] One payment event can be processed end-to-end.
- [ ] No spike in failed jobs, failed webhooks, or app error boundary events.

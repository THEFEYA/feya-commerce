# FEYA Measurement Foundation v1

Status: Measurement Spec foundation implemented; Measurement Engine unavailable
Owner: GMEL
Data implementation owner: GDAE
Architecture: FEYA Growth OS v1.0 CANONICAL

## What exists now

Tables:

- feya_growth_measurement_specs_v1
- feya_growth_measurement_outcomes_v1

Lock function:

- feya_fn_lock_measurement_spec_v1

A Measurement Spec can define:

- intent
- mode
- hypothesis
- entity scope
- primary metric
- guardrails
- secondary metrics
- diagnostic metrics
- baseline
- comparison
- minimum useful effect
- sample policy
- stopping policy
- measurement window
- segments
- contamination rules
- known confounders
- measurement-surface requirements
- evidence ceiling

## Measurement intent

BUSINESS_IMPROVEMENT
CAUSAL_LEARNING
OBSERVATION_ONLY

## Supported design vocabulary

OBSERVATIONAL
PRE_POST
MATCHED_COHORT
STAGED_ROLLOUT
SEO_PAGE_COHORT_TEST
RANDOMIZED_AB

Availability of a mode in the schema does not mean FEYA currently has enough data/traffic to use it.

## Evidence ceiling

L0_OBSERVATION
L1_ASSOCIATION
L2_PLAUSIBLE_HYPOTHESIS_SUPPORT
L3_QUASI_EXPERIMENTAL_EVIDENCE
L4_CONTROLLED_EVIDENCE

An agent cannot increase the evidence ceiling after seeing a result.

## Spec lock

Locking a DRAFT spec:

- verifies expected spec_version
- requires a primary metric unless intent=OBSERVATION_ONLY
- computes SHA-256 over material measurement fields
- sets measurement_status=LOCKED
- stores locked_at

After lock, material fields cannot be changed in place.

Allowed lifecycle fields can still progress, for example:

LOCKED -> RUNNING

A materially different measurement design must become a new spec version.

## Validation performed

Rollback-only test:

1. created PRE_POST Measurement Spec
2. locked spec
3. verified SHA-256 hash exists
4. attempted to replace primary metric
5. database rejected mutation
6. changed lifecycle status to RUNNING
7. lifecycle change succeeded
8. rolled back

After rollback:

test Measurement Specs = 0

## What does NOT exist yet

No production Measurement Engine calculations.

No GA4 measurement dataset.

No GSC warehouse dataset.

No Commerce Truth order dataset.

No randomized experiment assignment service.

No automatic causal conclusion.

Capability states:

MEASUREMENT_SPEC_REGISTRY = AVAILABLE_WITH_LIMITATIONS
MEASUREMENT_ENGINE = UNAVAILABLE

This is intentional. FEYA can define valid measurement before it has enough data to execute the measurement.

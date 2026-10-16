# ADR-038: Save owner reviewer images with write-only photo access

Date: 2026-10-16
Status: Implemented locally for IM1b; rollout and device acceptance remain owner steps.

## Context

Owner reviewers already receive exact page/slide snapshots and figures as
short-lived signed HTTPS URLs, plus validated Wikimedia image URLs with stored
title, credit and license. Students need to save these images from existing zoom
viewers. Shared-link readers must never gain private course-image controls.

The first IM1 run stopped because iOS named-album operations require full
read/write authorization. The owner's IM1b answer explicitly forbids requesting
full iOS access and accepts a different iOS destination.

## Decision

Add only the SDK 57-compatible expo-media-library ~57.0.5 dependency and config
plugin, with the requested save permission text and photo-only granular scope.
Load the native media and file APIs only when Save is pressed, preserving older
APK reader behavior. Keep filesystem APIs in Expo's supported legacy entry
point for cache download/copy, MIME-based naming and cleanup.

Always request write-only photo permission (`true`, `['photo']`). Android saves
directly into **Stay Focused** using createAlbumAsync with initialAssetLocalUri.
Do not look up albums: getAlbumAsync checks read permission on Android too.
The native initial-file path creates or reuses the same named directory and
inserts the completed file there without a standalone asset/move operation.
Source: MediaLibraryModule.kt:150/155/357, albums/CreateAlbum.kt:49,
albums/AlbumUtils.kt:137 in installed expo-media-library Android source.

iOS calls only saveToLibraryAsync under add-only permission, writing directly
to **Photos without an album**. Never call album lookup/creation on iOS and
never escalate to full access. Native evidence and the initial decision are
preserved in the IM1 acceptance record; saveToLibraryAsync uses its separate
write callback in ios/MediaLibraryModule.swift:107.

Download remote bytes into a unique cache directory. Reject failed HTTP,
non-image responses and empty files before media insertion; clean temporary
bytes on every exit. Local input is copied so its original is never removed.
Return typed saved/denied/failed results, with safe copy and an Open settings
action for denial. Full-resolution viewers use existing tokens and icons.

Mobile and owner website share the portable title-section-kind filename rule;
Wikimedia names also include its stored source title and saved confirmation
includes stored attribution/license. The web downloads a Blob via an object URL
so cross-origin images retain the filename, then releases that URL. Public
shared-reviewer code remains separate with no Save or private image fetching.

Keep SH1's canonical server-artifact and owner gates. No Android hide branch or
canonical-ID loss was found. Guard the dynamic expo-clipboard import and copy
call: module absence or copy rejection opens system sharing, leaves the link
visible and reports **Link ready to share**. System-sheet dismissal/failure
does not undo a successfully created share. The installed APK's module contents
and actual physical root cause remain UNVERIFIED (owner to confirm).

## Consequences

A **new preview APK** containing expo-media-library and expo-clipboard is
required. OTA alone cannot add native modules. The owner also publishes the
website. No deployment, remote migration, provider call or physical device
check is performed by this unattended slice. Realme gallery/permission/Share
behavior and iOS add-only behavior require owner verification.

# EPG (Electronic Program Guide) Requirements

## Introduction

This feature will add an Electronic Program Guide (EPG) system to the existing M3U player, allowing users to view detailed information about current and future programming of IPTV channels. The EPG will provide a richer and more professional experience, similar to traditional television players.

## Requirements

### Requirement 1

**User Story:** As a user of the M3U player, I want to see the current and future programming of IPTV channels, so I can know what content is available and plan my viewing.

#### Acceptance Criteria

1. WHEN the user selects a channel THEN the system MUST display current program information if available
2. WHEN the user accesses the EPG THEN the system MUST display a programming grid with at least 24 hours of future content
3. WHEN no EPG information is available THEN the system MUST display an appropriate informative message
4. WHEN the system loads EPG data THEN it MUST automatically update the information every 30 minutes

### Requirement 2

**User Story:** As a user, I want to easily navigate through programming of different channels and time slots, to quickly find the content that interests me.

#### Acceptance Criteria

1. WHEN the user opens the EPG THEN the system MUST display a grid interface with channels in rows and time slots in columns
2. WHEN the user clicks on a program THEN the system MUST show detailed program information (title, description, duration, genre)
3. WHEN the user navigates the grid THEN the system MUST allow horizontal scrolling by time and vertical scrolling by channels
4. WHEN the user selects a future program THEN the system MUST offer the option to set a reminder

### Requirement 3

**User Story:** As a user, I want the EPG to integrate seamlessly with the existing player interface, to maintain a consistent user experience.

#### Acceptance Criteria

1. WHEN the user accesses the EPG THEN the system MUST maintain the existing dark and professional visual theme
2. WHEN the EPG is open THEN the system MUST allow changing channels directly from the grid
3. WHEN the user closes the EPG THEN the system MUST return to the player view without interrupting playback
4. WHEN the EPG is visible THEN the system MUST show a visual indicator of the currently playing program

### Requirement 4

**User Story:** As a user, I want the system to automatically obtain EPG data from reliable sources, to have updated information without manual configuration.

#### Acceptance Criteria

1. WHEN the system loads an M3U playlist THEN it MUST attempt to obtain EPG data automatically using channel identifiers
2. WHEN EPG data is available THEN the system MUST cache it locally to improve performance
3. WHEN the system cannot obtain EPG data THEN it MUST continue functioning normally without affecting playback
4. WHEN multiple EPG sources are available THEN the system MUST prioritize the most reliable and up-to-date sources

### Requirement 5

**User Story:** As a user, I want to be able to search for specific programs in the EPG, to quickly find the content that interests me without manual navigation.

#### Acceptance Criteria

1. WHEN the user enters text in the EPG search THEN the system MUST filter programs that match the title or description
2. WHEN the user selects a search result THEN the system MUST automatically navigate to the corresponding channel and time slot
3. WHEN there are no search results THEN the system MUST display an appropriate informative message
4. WHEN the user clears the search THEN the system MUST return to showing the complete EPG grid

### Requirement 6

**User Story:** As a user, I want to be able to set reminders for future programs, so I don't miss the content that interests me.

#### Acceptance Criteria

1. WHEN the user selects a future program THEN the system MUST offer the option to create a reminder
2. WHEN the time approaches for a program with a reminder THEN the system MUST show a notification
3. WHEN the user confirms a reminder THEN the system MUST automatically switch to the corresponding channel
4. WHEN the user has active reminders THEN the system MUST show a list of pending reminders

### Requirement 7

**User Story:** As a user, I want the EPG to work both in online and offline modes, to have access to programming information even with limited connectivity.

#### Acceptance Criteria

1. WHEN the system is online THEN it MUST automatically download and update EPG data
2. WHEN the system is offline THEN it MUST use locally cached EPG data
3. WHEN cached data is outdated THEN the system MUST show an indicator of the last update date
4. WHEN connection is restored THEN the system MUST automatically synchronize EPG data
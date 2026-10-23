package com.vybe.social.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.vybe.social.ui.theme.*

enum class BottomNavTab {
    FEED, SEARCH, CREATE, REELS, PROFILE
}

@Composable
fun VybeBottomNav(
    selectedTab: BottomNavTab,
    onTabSelected: (BottomNavTab) -> Unit,
    modifier: Modifier = Modifier
) {
    val createGradient = Brush.linearGradient(
        colors = listOf(VybePink, VybePurple, VybeCyan)
    )

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(VybeDarkBg)
            .padding(vertical = 8.dp, horizontal = 12.dp),
        horizontalArrangement = Arrangement.SpaceAround,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Feed Tab
        NavItem(
            icon = if (selectedTab == BottomNavTab.FEED) Icons.Filled.Home else Icons.Outlined.Home,
            isSelected = selectedTab == BottomNavTab.FEED,
            onClick = { onTabSelected(BottomNavTab.FEED) }
        )

        // Search Tab
        NavItem(
            icon = if (selectedTab == BottomNavTab.SEARCH) Icons.Filled.Search else Icons.Outlined.Search,
            isSelected = selectedTab == BottomNavTab.SEARCH,
            onClick = { onTabSelected(BottomNavTab.SEARCH) }
        )

        // Create Post/Reel Tab (+ icon with gradient)
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(createGradient)
                .clickable { onTabSelected(BottomNavTab.CREATE) },
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.Add,
                contentDescription = "Create",
                tint = Color.White,
                modifier = Modifier.size(24.dp)
            )
        }

        // Reels Tab
        NavItem(
            icon = if (selectedTab == BottomNavTab.REELS) Icons.Filled.PlayCircleFilled else Icons.Outlined.PlayCircleOutline,
            isSelected = selectedTab == BottomNavTab.REELS,
            onClick = { onTabSelected(BottomNavTab.REELS) }
        )

        // Profile Tab
        NavItem(
            icon = if (selectedTab == BottomNavTab.PROFILE) Icons.Filled.Person else Icons.Outlined.Person,
            isSelected = selectedTab == BottomNavTab.PROFILE,
            onClick = { onTabSelected(BottomNavTab.PROFILE) }
        )
    }
}

@Composable
private fun NavItem(
    icon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (isSelected) VybeTextPrimary else VybeTextSecondary,
            modifier = Modifier.size(26.dp)
        )
    }
}

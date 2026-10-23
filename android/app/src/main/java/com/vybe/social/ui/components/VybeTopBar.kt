package com.vybe.social.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vybe.social.ui.theme.*

@OptIn(ExperimentalTextApi::class)
@Composable
fun VybeTopBar(
    onNotificationsClick: () -> Unit,
    onDirectMessagesClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val gradientColors = listOf(VybePink, VybePurple, VybeCyan)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(VybeDarkBg)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Gradient VYBE Brand Logo
        Text(
            text = "VYBE",
            style = TextStyle(
                brush = Brush.linearGradient(gradientColors),
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.5.sp
            )
        )

        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onNotificationsClick) {
                Icon(
                    imageVector = Icons.Outlined.FavoriteBorder,
                    contentDescription = "Notifications",
                    tint = VybeTextPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }

            IconButton(onClick = onDirectMessagesClick) {
                Icon(
                    imageVector = Icons.Outlined.ChatBubbleOutline,
                    contentDescription = "Direct Messages",
                    tint = VybeTextPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

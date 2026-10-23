package com.vybe.social.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.vybe.social.data.VybeRepository
import com.vybe.social.ui.theme.*

@Composable
fun SearchScreen(
    repository: VybeRepository,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    val posts by repository.getPostsFlow().collectAsState(initial = emptyList())

    val filteredPosts = remember(posts, searchQuery) {
        if (searchQuery.isBlank()) posts else posts.filter {
            it.caption.contains(searchQuery, ignoreCase = true) ||
            it.username.contains(searchQuery, ignoreCase = true)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VybeDarkBg)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search tags, users, or reels...", color = VybeTextMuted) },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = VybeTextSecondary
                )
            },
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = VybeDarkSurface,
                unfocusedContainerColor = VybeDarkSurface,
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedBorderColor = VybePink,
                unfocusedBorderColor = VybeDarkBorder
            ),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Explore Discover Grid
        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(filteredPosts, key = { it.postId }) { post ->
                AsyncImage(
                    model = post.mediaURL.ifEmpty { "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400" },
                    contentDescription = post.caption,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .aspectRatio(1f)
                        .background(VybeDarkSurface)
                )
            }
        }
    }
}

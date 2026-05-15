package com.example.waiter.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Store
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.waiter.network.BranchInfo
import com.example.waiter.ui.theme.*
import com.example.waiter.viewmodel.AuthViewModel

@Composable
fun BranchPickerScreen(
    branches: List<BranchInfo>,
    viewModel: AuthViewModel
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        Spacer(Modifier.height(48.dp))

        Text(
            text = "SELECT BRANCH",
            fontWeight = FontWeight.Black,
            fontSize = 20.sp,
            letterSpacing = 3.sp,
            color = OliveSecondary
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = "Choose your branch to continue",
            fontSize = 13.sp,
            color = OliveOnSurfaceVariant
        )

        Spacer(Modifier.height(32.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(branches) { branch ->
                BranchCard(branch = branch, onClick = { viewModel.selectBranch(branch) })
            }
        }
    }
}

@Composable
private fun BranchCard(branch: BranchInfo, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = OliveSurfaceContainerLowest),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .padding(0.dp),
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    color = OlivePrimaryFixed,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.size(44.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Outlined.Store,
                            contentDescription = null,
                            tint = OlivePrimary,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = branch.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = OliveSecondary
                )
                Text(
                    text = branch.id.take(8) + "…",
                    fontSize = 10.sp,
                    color = OliveOnSurfaceVariant
                )
            }

            Icon(
                imageVector = Icons.Outlined.ChevronRight,
                contentDescription = null,
                tint = OliveOnSurfaceVariant.copy(alpha = 0.5f)
            )
        }
    }
}
